document.addEventListener('DOMContentLoaded', () => {
  let conversations = [];
  let activeId = null;

  const historyList = document.getElementById('history-list');
  const searchInput = document.getElementById('search-input');
  const newChatButton = document.getElementById('new-chat-btn');
  const chatTitle = document.getElementById('chat-title');
  const messages = document.getElementById('messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const textarea = document.getElementById('user-input');
  const sendButton = document.getElementById('send-btn');

  function getConv(id) {
    return conversations.find((conversation) => conversation.id === id);
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function autoTitle(text) {
    const trimmed = text.trim();
    return trimmed.slice(0, 42) + (trimmed.length > 42 ? '...' : '');
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

  function setEmptyState() {
    messages.innerHTML = `
      <div id="empty-state" class="empty-state">
        <div class="empty-badge">AI</div>
        <h3 class="empty-title">Welcome to G2GPT</h3>
        <p class="empty-sub">Start a new conversation or select one from the sidebar.</p>
      </div>
    `;
  }

  function appendBubble(role, content, animate = true) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    if (!animate) {
      row.style.animation = 'none';
    }

    row.innerHTML = `
      <div class="avatar ${role}">${role === 'user' ? 'You' : 'AI'}</div>
      <div class="bubble">${formatMessage(content)}</div>
    `;

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderMessages(messageList) {
    messages.innerHTML = '';

    if (!messageList || messageList.length === 0) {
      setEmptyState();
      return;
    }

    messageList.forEach((message) => appendBubble(message.role, message.content, false));
    messages.scrollTop = messages.scrollHeight;
  }

  function renderHistory() {
    const query = searchInput.value.trim().toLowerCase();
    historyList.innerHTML = '';

    const filtered = conversations
      .filter((conversation) => !query || conversation.title.toLowerCase().includes(query))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty-history">No conversations yet.</div>';
      return;
    }

    const groups = groupConvs(filtered);

    ['Today', 'Yesterday', 'Older'].forEach((label) => {
      if (!groups[label].length) {
        return;
      }

      const sectionLabel = document.createElement('div');
      sectionLabel.className = 'section-label';
      sectionLabel.textContent = label;
      historyList.appendChild(sectionLabel);

      groups[label].forEach((conversation) => {
        const item = document.createElement('div');
        item.className = `history-item${conversation.id === activeId ? ' active' : ''}`;
        item.innerHTML = `
          <span class="hi-title">${escapeHtml(conversation.title)}</span>
          <button class="hi-delete" type="button" title="Delete conversation" aria-label="Delete conversation">✕</button>
        `;

        item.addEventListener('click', () => loadConv(conversation.id));
        item.querySelector('.hi-delete').addEventListener('click', (event) => deleteConv(event, conversation.id));
        historyList.appendChild(item);
      });
    });
  }

  function loadConv(id) {
    activeId = id;
    const conversation = getConv(id);

    if (!conversation) {
      chatTitle.textContent = 'New Conversation';
      renderMessages([]);
      renderHistory();
      return;
    }

    chatTitle.textContent = conversation.title;
    renderMessages(conversation.messages);
    renderHistory();
  }

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

  function deleteConv(event, id) {
    event.stopPropagation();
    conversations = conversations.filter((conversation) => conversation.id !== id);

    if (activeId === id) {
      if (conversations.length > 0) {
        loadConv(conversations[0].id);
      } else {
        activeId = null;
        chatTitle.textContent = 'New Conversation';
        renderMessages([]);
      }
    }

    renderHistory();
  }

  async function callLLM(messageList) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: messageList })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to reach the AI service.');
    }

    return data.reply || data.response || 'No response was returned.';
  }

  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text) {
      return;
    }

    textarea.value = '';
    textarea.style.height = 'auto';

    if (!activeId) {
      newChat();
    }

    const conversation = getConv(activeId);
    if (!conversation) {
      return;
    }

    if (conversation.messages.length === 0) {
      conversation.title = autoTitle(text);
      chatTitle.textContent = conversation.title;
    }

    conversation.messages.push({ role: 'user', content: text });
    conversation.updatedAt = Date.now();
    appendBubble('user', text);
    renderHistory();

    typingIndicator.classList.add('show');
    typingIndicator.setAttribute('aria-hidden', 'false');
    messages.scrollTop = messages.scrollHeight;

    let reply = '';

    try {
      reply = await callLLM(conversation.messages);
    } catch (error) {
      reply = 'Unable to reach the AI right now. Please check the API configuration and try again.';
    }

    typingIndicator.classList.remove('show');
    typingIndicator.setAttribute('aria-hidden', 'true');

    conversation.messages.push({ role: 'bot', content: reply });
    conversation.updatedAt = Date.now();
    appendBubble('bot', reply);
    renderHistory();
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

  sendButton.addEventListener('click', sendMessage);
  newChatButton.addEventListener('click', newChat);
  searchInput.addEventListener('input', renderHistory);

  renderHistory();
  setEmptyState();
});