// Utility functions that can be tested
function getConv(conversations, id) {
  return conversations.find((conversation) => conversation.id === id);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function autoTitle(text) {
  const trimmed = text.trim();
  return trimmed.slice(0, 42) + (trimmed.length > 42 ? "." : "");
}

function groupConvs(list) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const groups = { Today: [], Yesterday: [], Older: [] };

  list.forEach((conversation) => {
    if (conversation.updatedAt >= today) {
      groups.Today.push(conversation);
    } else if (conversation.updatedAt >= yesterday) {
      groups.Yesterday.push(conversation);
    } else {
      groups.Older.push(conversation);
    }
  });

  return groups;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMessage(str) {
  return escapeHtml(str).replace(/\n/g, "<br>");
}

function setEmptyState(messagesContainer) {
  const container = messagesContainer || messages;
  container.innerHTML = `
    <div id="empty-state" class="empty-state">
      <div class="empty-badge">AI</div>
      <h3 class="empty-title">Welcome to G2GPT</h3>
      <p class="empty-sub">Start a new conversation or select one from the sidebar.</p>
    </div>
  `;
}

function appendBubble(role, content, animate = true, messagesContainer) {
  const container = messagesContainer || messages;

  let emptyState = null;
  if (container.querySelector) {
    emptyState = container.querySelector("#empty-state");
  } else if (container.getElementById) {
    emptyState = container.getElementById("empty-state");
  }

  if (emptyState && emptyState.remove) {
    emptyState.remove();
  }

  const row = document.createElement ? document.createElement("div") : {
    className: "",
    style: {},
    innerHTML: ""
  };

  row.className = `msg-row ${role === "assistant" ? "bot" : role}`;

  if (!animate && row.style) {
    row.style.animation = "none";
  }

  row.innerHTML = `
    <div class="avatar ${role === "assistant" ? "bot" : role}">
      ${role === "user" ? "You" : "AI"}
    </div>
    <div class="bubble">${formatMessage(content)}</div>
  `;

  if (container.appendChild) {
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  return row;
}

function renderMessages(messageList, messagesContainer) {
  const container = messagesContainer || messages;
  container.innerHTML = "";

  if (!messageList || messageList.length === 0) {
    setEmptyState(container);
    return;
  }

  messageList.forEach((message) => appendBubble(message.role, message.content, false, container));

  if (container.scrollTop !== undefined) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderHistory(conversations, historyListContainer, searchInputElement, currentActiveId) {
  const historyContainer = historyListContainer || historyList;
  const searchElement = searchInputElement || searchInput;

  const query = (searchElement && searchElement.value)
    ? searchElement.value.trim().toLowerCase()
    : "";

  historyContainer.innerHTML = "";

  if (!conversations) {
    conversations = [];
  }

  const filtered = conversations
    .filter((conversation) => !query || conversation.title.toLowerCase().includes(query))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (filtered.length === 0) {
    historyContainer.innerHTML = '<div class="empty-history">No conversations yet.</div>';
    return;
  }

  const groups = groupConvs(filtered);

  ["Today", "Yesterday", "Older"].forEach((label) => {
    if (!groups[label].length) {
      return;
    }

    const sectionLabel = document.createElement ? document.createElement("div") : {};
    sectionLabel.className = "section-label";
    sectionLabel.textContent = label;

    if (historyContainer.appendChild) {
      historyContainer.appendChild(sectionLabel);
    }

    groups[label].forEach((conversation) => {
      const item = document.createElement ? document.createElement("div") : {};
      const activeIdToCheck =
        currentActiveId !== undefined
          ? currentActiveId
          : (typeof activeId !== "undefined" ? activeId : null);

      item.className = `history-item${conversation.id === activeIdToCheck ? " active" : ""}`;
      item.innerHTML = `
        <span class="hi-title">${escapeHtml(conversation.title)}</span>
        <button class="hi-delete" type="button" title="Delete conversation" aria-label="Delete conversation">✕</button>
      `;

      if (item.addEventListener) {
        item.addEventListener("click", (event) => {
          if (event.target.classList.contains("hi-delete")) {
            return;
          }
          loadConv(conversation.id);
        });

        const deleteBtn = item.querySelector ? item.querySelector(".hi-delete") : null;
        if (deleteBtn) {
          deleteBtn.addEventListener("click", (event) => {
            deleteConv(event, conversation.id);
          });
        }
      }

      if (historyContainer.appendChild) {
        historyContainer.appendChild(item);
      }
    });
  });
}

// Backward-compatible single-model API helper
async function callLLM(messageList) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: messageList })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to reach the AI service.");
    }

    return data.reply || data.response || "No response was returned.";
  } catch (error) {
    console.error("Dashboard: callLLM error:", error);
    throw error;
  }
}

async function callMultiLLM(messageList, selectedModels, conversationId = null) {
  try {
    const response = await fetch("/api/chat-multi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messageList,
        selectedModels,
        conversationId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to reach the multi-model AI service.");
    }

    return data.responses || [];
  } catch (error) {
    console.error("Dashboard: callMultiLLM error:", error);
    throw error;
  }
}

function getSelectedModels() {
  const checked = Array.from(
    document.querySelectorAll('input[name="modelOption"]:checked')
  ).map((input) => input.value);

  return checked.slice(0, 3);
}

function setStatus(message, isError = false) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b91c1c" : "";
}

function clearMultiResponses() {
  if (!multiResponseArea) return;

  multiResponseArea.style.display = "none";

  if (modelName1) modelName1.textContent = "Model 1";
  if (modelName2) modelName2.textContent = "Model 2";
  if (modelName3) modelName3.textContent = "Model 3";

  if (response1) response1.textContent = "No response yet.";
  if (response2) response2.textContent = "No response yet.";
  if (response3) response3.textContent = "No response yet.";
}

function renderMultiResponses(responses) {
  if (!multiResponseArea) return;

  multiResponseArea.style.display = "block";

  const names = [modelName1, modelName2, modelName3];
  const texts = [response1, response2, response3];

  for (let i = 0; i < 3; i++) {
    const res = responses[i];

    if (!res) {
      names[i].textContent = `Model ${i + 1}`;
      texts[i].textContent = "No response.";
      continue;
    }

    names[i].textContent = res.model || `Model ${i + 1}`;

    if (res.success) {
      texts[i].textContent = res.reply || "No response.";
    } else {
      texts[i].textContent = res.error || "Failed to respond.";
    }
  }
}

function renderModelOptions(models) {
  if (!modelsContainer) return;

  if (!models || models.length === 0) {
    modelsContainer.innerHTML = "<p>No models available.</p>";
    return;
  }

  modelsContainer.innerHTML = models.map((model, index) => `
    <label class="model-option">
      <input
        type="checkbox"
        name="modelOption"
        value="${escapeHtml(model.name)}"
        ${index < 3 ? "checked" : ""}
      />
      <span>${escapeHtml(model.name)}</span>
    </label>
  `).join("");

  const checkboxes = document.querySelectorAll('input[name="modelOption"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selected = getSelectedModels();
      if (selected.length > 3) {
        checkbox.checked = false;
        setStatus("You can select up to 3 models.", true);
      } else {
        setStatus("");
      }
    });
  });
}

async function loadModels() {
  if (!modelsContainer) return;

  modelsContainer.innerHTML = "<p>Loading models...</p>";

  try {
    const response = await fetch("/api/models");
    const data = await response.json();

    if (!response.ok || !data.success) {
      modelsContainer.innerHTML = `<p>${escapeHtml(data.message || "Failed to load models.")}</p>`;
      return;
    }

    renderModelOptions(data.models || []);
  } catch (error) {
    console.error("Dashboard: loadModels error:", error);
    modelsContainer.innerHTML = "<p>Could not load models.</p>";
  }
}

// Export functions for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getConv,
    genId,
    autoTitle,
    groupConvs,
    escapeHtml,
    formatMessage,
    setEmptyState,
    appendBubble,
    renderMessages,
    renderHistory,
    callLLM,
    callMultiLLM,
    getSelectedModels,
    clearMultiResponses,
    renderMultiResponses
  };
}

// Global variables
let conversations = [];
let activeId = null;

let historyList;
let searchInput;
let newChatButton;
let chatTitle;
let messages;
let typingIndicator;
let textarea;
let sendButton;

let modelsContainer;
let statusMessage;
let multiResponseArea;
let modelName1;
let modelName2;
let modelName3;
let response1;
let response2;
let response3;

async function loadConversationsFromServer() {
  try {
    const response = await fetch("/api/conversations");

    if (response.ok) {
      const data = await response.json();
      conversations = (data.conversations || []).map((conv) => ({
        id: conv.id,
        title: conv.title,
        messages: [],
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime(),
        messageCount: conv.message_count
      }));
    } else {
      conversations = [];
    }
  } catch (error) {
    console.error("Dashboard: Error loading conversations:", error);
    conversations = [];
  }
}

async function loadMessagesFromServer(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`);

    if (response.ok) {
      const data = await response.json();
      const conversation = getConv(conversations, conversationId);

      if (conversation) {
        conversation.messages = (data.messages || []).map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime()
        }));
      }
    }
  } catch (error) {
    console.error("Dashboard: Error loading messages:", error);
  }
}

async function saveConversationToServer(conversation) {
  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: conversation.id,
        title: conversation.title
      })
    });

    if (!response.ok) {
      console.error("Dashboard: Failed to save conversation:", response.status);
    }
  } catch (error) {
    console.error("Dashboard: Error saving conversation:", error);
  }
}

async function deleteConversationFromServer(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      console.error("Dashboard: Failed to delete conversation:", response.status);
    }
  } catch (error) {
    console.error("Dashboard: Error deleting conversation:", error);
  }
}

async function sendMessage() {
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) return;

  textarea.value = "";
  textarea.style.height = "auto";
  setStatus("");

  if (!activeId) {
    newChat();
  }

  const conversation = getConv(conversations, activeId);
  if (!conversation) return;

  if (conversation.messages.length === 0) {
    conversation.title = autoTitle(text);
    chatTitle.textContent = conversation.title;
    await saveConversationToServer(conversation);
  }

  const userMessage = {
    role: "user",
    content: text,
    timestamp: Date.now()
  };

  conversation.messages.push(userMessage);
  conversation.updatedAt = Date.now();

  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);

  if (typingIndicator) {
    typingIndicator.classList.add("show");
    typingIndicator.setAttribute("aria-hidden", "false");
  }
  if (messages) {
    messages.scrollTop = messages.scrollHeight;
  }

  let responses = [];

  try {
    const selectedModels = getSelectedModels();

    if (selectedModels.length === 0) {
      throw new Error("Please select at least one model.");
    }

    responses = await callMultiLLM(
      conversation.messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      selectedModels,
      activeId
    );
  } catch (error) {
    console.error("Dashboard: Multi-model request failed", error);
    responses = [
      {
        model: "Error",
        success: false,
        reply: "",
        error: error.message || "Unable to reach the AI service."
      }
    ];
    setStatus(error.message || "Unable to reach the AI service.", true);
  }

  if (typingIndicator) {
    typingIndicator.classList.remove("show");
    typingIndicator.setAttribute("aria-hidden", "true");
  }

  responses.forEach((response) => {
    const content = response.success
      ? `[${response.model}] ${response.reply}`
      : `[${response.model}] ${response.error || "Failed to respond."}`;

    conversation.messages.push({
      role: "assistant",
      content,
      timestamp: Date.now()
    });
  });

  conversation.updatedAt = Date.now();

  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
  renderMultiResponses(responses);

  setStatus("Responses loaded successfully.");
}

function newChat() {
  const conversation = {
    id: genId(),
    title: "New Conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  conversations.unshift(conversation);
  loadConv(conversation.id);
}

async function loadConv(id) {
  activeId = id;
  const conversation = getConv(conversations, id);

  clearMultiResponses();

  if (!conversation) {
    if (chatTitle) chatTitle.textContent = "New Conversation";
    renderMessages([], messages);
    renderHistory(conversations, historyList, searchInput, activeId);
    return;
  }

  if (chatTitle) chatTitle.textContent = conversation.title;

  if (conversation.messages.length === 0 && conversation.messageCount > 0) {
    await loadMessagesFromServer(id);
  }

  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
}

async function deleteConv(event, id) {
  event.stopPropagation();

  await deleteConversationFromServer(id);
  conversations = conversations.filter((conversation) => conversation.id !== id);

  if (activeId === id) {
    if (conversations.length > 0) {
      await loadConv(conversations[0].id);
    } else {
      activeId = null;
      if (chatTitle) chatTitle.textContent = "New Conversation";
      clearMultiResponses();
      renderMessages([], messages);
    }
  }

  renderHistory(conversations, historyList, searchInput, activeId);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    historyList = document.getElementById("history-list");
    searchInput = document.getElementById("search-input");
    newChatButton = document.getElementById("new-chat-btn");
    chatTitle = document.getElementById("chat-title");
    messages = document.getElementById("messages");
    typingIndicator = document.getElementById("typing-indicator");
    textarea = document.getElementById("user-input");
    sendButton = document.getElementById("send-btn");

    modelsContainer = document.getElementById("models-container");
    statusMessage = document.getElementById("status-message");
    multiResponseArea = document.getElementById("multi-response-area");
    modelName1 = document.getElementById("model-name-1");
    modelName2 = document.getElementById("model-name-2");
    modelName3 = document.getElementById("model-name-3");
    response1 = document.getElementById("response-1");
    response2 = document.getElementById("response-2");
    response3 = document.getElementById("response-3");

    clearMultiResponses();

    if (textarea) {
      textarea.addEventListener("input", function handleInput() {
        this.style.height = "auto";
        this.style.height = `${Math.min(this.scrollHeight, 120)}px`;
      });

      textarea.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
        }
      });
    }

    if (sendButton) {
      sendButton.addEventListener("click", () => {
        sendMessage();
      });
    }

    if (newChatButton) {
      newChatButton.addEventListener("click", newChat);
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderHistory(conversations, historyList, searchInput, activeId);
      });
    }

    loadModels();

    loadConversationsFromServer().then(() => {
      renderHistory(conversations, historyList, searchInput, activeId);

      if (conversations.length === 0) {
        setEmptyState(messages);
      }
    });
  });
}