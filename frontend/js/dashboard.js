
// Utility functions that can be tested
function getConv(conversations, id) {
  return conversations.find((conversation) => conversation.id === id);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function autoTitle(text) {
  const trimmed = text.trim();
  return trimmed.slice(0, 42) + (trimmed.length > 42 ? '.' : '');
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMessage(str) {
  return escapeHtml(str).replace(/\n/g, '<br>');
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

function appendBubble(role, content, animate = true, messagesContainer, modelName) {
  const container = messagesContainer || messages;
  const emptyState = container.querySelector ? container.querySelector('#empty-state') :
                     (container.getElementById ? container.getElementById('empty-state') : null);

  if (emptyState && emptyState.remove) {
    emptyState.remove();
  }

  const row = document.createElement ? document.createElement('div') : {
    className: '',
    style: {},
    innerHTML: '',
  };

  row.className = `msg-row ${role}`;

  if (!animate) {
    row.style.animation = 'none';
  }

  // Feature 3: show model tag on assistant messages
  const modelTag = (role === 'assistant' && modelName)
    ? `<div class="model-tag">${escapeHtml(modelName)}</div>`
    : '';

  row.innerHTML = `
    <div class="avatar ${role === 'assistant' ? 'bot' : role}">${role === 'user' ? 'You' : 'AI'}</div>
    <div class="bubble-wrap">
      ${modelTag}
      <div class="bubble">${formatMessage(content)}</div>
    </div>
  `;

  if (container.appendChild) {
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }
  return row;
}

function renderMessages(messageList, messagesContainer) {
  const container = messagesContainer || messages;
  container.innerHTML = '';

  if (!messageList || messageList.length === 0) {
    setEmptyState(container);
    return;
  }

  messageList.forEach((message) => appendBubble(message.role, message.content, false, container, message.model_name));
  if (container.scrollTop !== undefined) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderHistory(conversations, historyListContainer, searchInputElement, currentActiveId) {
  const historyContainer = historyListContainer || historyList;
  const searchElement = searchInputElement || searchInput;

  const query = (searchElement && searchElement.value) ? searchElement.value.trim().toLowerCase() : '';
  historyContainer.innerHTML = '';

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

  ['Today', 'Yesterday', 'Older'].forEach((label) => {
    if (!groups[label].length) return;

    const sectionLabel = document.createElement ? document.createElement('div') : {};
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = label;

    if (historyContainer.appendChild) {
      historyContainer.appendChild(sectionLabel);
    }

    groups[label].forEach((conversation) => {
      const item = document.createElement ? document.createElement('div') : {};
      const activeIdToCheck = currentActiveId !== undefined ? currentActiveId : (typeof activeId !== 'undefined' ? activeId : null);
      item.className = `history-item${conversation.id === activeIdToCheck ? ' active' : ''}`;
      item.innerHTML = `
        <span class="hi-title">${escapeHtml(conversation.title)}</span>
        <button class="hi-delete" type="button" title="Delete conversation" aria-label="Delete conversation">✕</button>
      `;

      if (item.addEventListener) {
        item.addEventListener('click', (event) => {
          if (event.target.classList.contains('hi-delete')) return;
          loadConv(conversation.id);
        });

        const deleteBtn = item.querySelector('.hi-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (event) => {
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

async function callLLM(messageList, model) {
  console.log('Dashboard: callLLM called with messages:', messageList, 'model:', model);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messageList, model: model || null })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to reach the AI service.');
    }

    const reply = data.reply || data.response || 'No response was returned.';
    const usedModel = data.model || model || null;
    return { reply, model: usedModel };
  } catch (error) {
    console.error('Dashboard: callLLM error:', error);
    throw error;
  }
}

// Feature 2: Call multiple models simultaneously
async function callMultiLLM(messageList, models) {
  console.log('Dashboard: callMultiLLM called with models:', models);

  const response = await fetch('/api/chat/multi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messageList, models })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Multi-model query failed.');
  }

  return data.results;
}

// Export functions for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
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
    callMultiLLM
  };
}

// Global variables for the dashboard
let conversations = [];
let activeId = null;
let compareMode = false;
let historyList, searchInput, newChatButton, chatTitle, messages, typingIndicator, textarea, sendButton;
let modelSelect, compareBtn, comparePanel, modelCheckboxes;

// Feature 2: Render side-by-side comparison results
function renderCompareResults(results) {
  const existing = messages.querySelector('.compare-results');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.className = 'compare-results';

  results.forEach(result => {
    const col = document.createElement('div');
    col.className = 'compare-result-col';

    col.innerHTML = `
      <div class="compare-result-header">${escapeHtml(result.model)}</div>
      <div class="compare-result-body ${result.success ? '' : 'compare-result-error'}">
        ${result.success ? formatMessage(result.reply) : escapeHtml(result.error || 'Error')}
      </div>
    `;

    container.appendChild(col);
  });

  messages.appendChild(container);
  messages.scrollTop = messages.scrollHeight;
}

// Feature 2: Get selected models from checkboxes
function getSelectedCompareModels() {
  if (!modelCheckboxes) return [];
  const checked = modelCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checked).map(cb => cb.value);
}

// Feature 1: Populate the model dropdown
async function loadModels() {
  try {
    const response = await fetch('/api/models');
    if (!response.ok) return;
    const data = await response.json();
    const models = data.models || [];

    if (modelSelect) {
      modelSelect.innerHTML = models.map(m =>
        `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`
      ).join('');
    }

    if (modelCheckboxes) {
      modelCheckboxes.innerHTML = models.map(m => `
        <label class="model-checkbox-label">
          <input type="checkbox" value="${escapeHtml(m.name)}" />
          ${escapeHtml(m.name)}
        </label>
      `).join('');
    }
  } catch (err) {
    console.error('Dashboard: Failed to load models:', err);
  }
}

// Load conversations from server
async function loadConversationsFromServer() {
  try {
    const response = await fetch('/api/conversations');
    if (response.ok) {
      const data = await response.json();
      conversations = data.conversations.map(conv => ({
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
    console.error('Dashboard: Error loading conversations:', error);
    conversations = [];
  }
}

// Load messages for a specific conversation
async function loadMessagesFromServer(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    if (response.ok) {
      const data = await response.json();
      const conversation = getConv(conversations, conversationId);
      if (conversation) {
        conversation.messages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          model_name: msg.model_name || null,
          timestamp: new Date(msg.created_at).getTime()
        }));
      }
    }
  } catch (error) {
    console.error('Dashboard: Error loading messages:', error);
  }
}

// Save conversation to server
async function saveConversationToServer(conversation) {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversation.id, title: conversation.title })
    });
    if (!response.ok) {
      console.error('Dashboard: Failed to save conversation');
    }
  } catch (error) {
    console.error('Dashboard: Error saving conversation:', error);
  }
}

// Save message to server
async function saveMessageToServer(conversationId, role, content, modelName) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, model_name: modelName || null })
    });
    if (!response.ok) {
      console.error('Dashboard: Failed to save message:', response.status);
    }
  } catch (error) {
    console.error('Dashboard: Error saving message:', error);
  }
}

// Delete conversation from server
async function deleteConversationFromServer(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    if (!response.ok) {
      console.error('Dashboard: Failed to delete conversation:', response.status);
    }
  } catch (error) {
    console.error('Dashboard: Error deleting conversation:', error);
  }
}

// Global function to send message
async function sendMessage() {
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) return;

  textarea.value = '';
  textarea.style.height = 'auto';

  if (!activeId) newChat();

  const conversation = getConv(conversations, activeId);
  if (!conversation) return;

  if (conversation.messages.length === 0) {
    conversation.title = autoTitle(text);
    chatTitle.textContent = conversation.title;
    await saveConversationToServer(conversation);
  }

  conversation.messages.push({ role: 'user', content: text });
  conversation.updatedAt = Date.now();
  appendBubble('user', text, true, messages, null);
  renderHistory(conversations, historyList, searchInput, activeId);
  await saveMessageToServer(activeId, 'user', text, null);

  typingIndicator.classList.add('show');
  typingIndicator.setAttribute('aria-hidden', 'false');
  messages.scrollTop = messages.scrollHeight;

  // Feature 2: Compare mode
  if (compareMode) {
    const selectedModels = getSelectedCompareModels();

    if (selectedModels.length === 0) {
      typingIndicator.classList.remove('show');
      typingIndicator.setAttribute('aria-hidden', 'true');
      appendBubble('assistant', 'Please select at least one model to compare.', true, messages, null);
      return;
    }

    let results = [];
    try {
      results = await callMultiLLM(conversation.messages, selectedModels);
    } catch (error) {
      results = selectedModels.map(m => ({ model: m, success: false, error: error.message }));
    }

    typingIndicator.classList.remove('show');
    typingIndicator.setAttribute('aria-hidden', 'true');

    renderCompareResults(results);

    for (const result of results) {
      if (result.success) {
        conversation.messages.push({ role: 'assistant', content: result.reply, model_name: result.model });
        await saveMessageToServer(activeId, 'assistant', result.reply, result.model);
      }
    }

    conversation.updatedAt = Date.now();
    renderHistory(conversations, historyList, searchInput, activeId);
    return;
  }

  // Feature 1: Single model mode
  const selectedModel = modelSelect ? modelSelect.value : null;
  let reply = '';
  let usedModel = null;

  try {
    const result = await callLLM(conversation.messages, selectedModel);
    reply = result.reply;
    usedModel = result.model;
  } catch (error) {
    reply = 'Unable to reach the AI right now. Please check the API configuration and try again.';
  }

  typingIndicator.classList.remove('show');
  typingIndicator.setAttribute('aria-hidden', 'true');

  conversation.messages.push({ role: 'assistant', content: reply, model_name: usedModel });
  conversation.updatedAt = Date.now();
  // Feature 3: pass model name so bubble shows the tag
  appendBubble('assistant', reply, true, messages, usedModel);
  renderHistory(conversations, historyList, searchInput, activeId);
  await saveMessageToServer(activeId, 'assistant', reply, usedModel);
}

// Global function to create new chat
function newChat() {
  const conversation = {
    id: genId(),
    title: 'New Conversation',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  conversations.unshift(conversation);
  loadConv(conversation.id);
}

// Global function to load conversation
async function loadConv(id) {
  activeId = id;
  const conversation = getConv(conversations, id);

  if (!conversation) {
    chatTitle.textContent = 'New Conversation';
    renderMessages([], messages);
    renderHistory(conversations, historyList, searchInput, activeId);
    return;
  }

  chatTitle.textContent = conversation.title;

  if (conversation.messages.length === 0 && conversation.messageCount > 0) {
    await loadMessagesFromServer(id);
  }

  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
}

// Global function to delete conversation
async function deleteConv(event, id) {
  event.stopPropagation();
  await deleteConversationFromServer(id);
  conversations = conversations.filter((conversation) => conversation.id !== id);

  if (activeId === id) {
    if (conversations.length > 0) {
      await loadConv(conversations[0].id);
    } else {
      activeId = null;
      chatTitle.textContent = 'New Conversation';
      renderMessages([], messages);
    }
  }

  renderHistory(conversations, historyList, searchInput, activeId);
}

// Browser initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    historyList = document.getElementById('history-list');
    searchInput = document.getElementById('search-input');
    newChatButton = document.getElementById('new-chat-btn');
    chatTitle = document.getElementById('chat-title');
    messages = document.getElementById('messages');
    typingIndicator = document.getElementById('typing-indicator');
    textarea = document.getElementById('user-input');
    sendButton = document.getElementById('send-btn');
    modelSelect = document.getElementById('model-select');
    compareBtn = document.getElementById('compare-btn');
    comparePanel = document.getElementById('compare-panel');
    modelCheckboxes = document.getElementById('model-checkboxes');

    loadModels();

    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        compareMode = !compareMode;
        compareBtn.classList.toggle('active', compareMode);
        compareBtn.textContent = compareMode ? '✕ Exit Compare' : '⇄ Compare Models';
        if (comparePanel) comparePanel.style.display = compareMode ? 'block' : 'none';
        if (modelSelect) modelSelect.style.display = compareMode ? 'none' : 'inline-block';
      });
    }

    textarea.addEventListener('input', function handleInput() {
      this.style.height = 'auto';
      this.style.height = `${Math.min(this.scrollHeight, 120)}px`;
    });

    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    sendButton.addEventListener('click', () => sendMessage());
    newChatButton.addEventListener('click', newChat);
    searchInput.addEventListener('input', () => renderHistory(conversations, historyList, searchInput, activeId));

    loadConversationsFromServer().then(() => {
      renderHistory(conversations, historyList, searchInput, activeId);
      if (conversations.length === 0) setEmptyState(messages);
    });
  });
}
