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

function appendBubble(role, content, animate = true, messagesContainer) {
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

  row.innerHTML = `
    <div class="avatar ${role === 'assistant' ? 'bot' : role}">${role === 'user' ? 'You' : 'AI'}</div>
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
  container.innerHTML = '';

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
    if (!groups[label].length) {
      return;
    }

    const sectionLabel = document.createElement ? document.createElement('div') : {};
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = label;
    
    if (historyContainer.appendChild) {
      historyContainer.appendChild(sectionLabel);
    }

    groups[label].forEach((conversation) => {
      const item = document.createElement ? document.createElement('div') : {};
      // Use passed activeId parameter or try to access global activeId if in browser
      const activeIdToCheck = currentActiveId !== undefined ? currentActiveId : (typeof activeId !== 'undefined' ? activeId : null);
      item.className = `history-item${conversation.id === activeIdToCheck ? ' active' : ''}`;
      item.innerHTML = `
        <span class="hi-title">${escapeHtml(conversation.title)}</span>
        <button class="hi-delete" type="button" title="Delete conversation" aria-label="Delete conversation">✕</button>
      `;

      // Add click handler for conversation selection
      if (item.addEventListener) {
        item.addEventListener('click', (event) => {
          // Don't trigger if delete button was clicked
          if (event.target.classList.contains('hi-delete')) {
            return;
          }
          console.log('Dashboard: Loading conversation from history:', conversation.id);
          loadConv(conversation.id);
        });

        // Add click handler for delete button
        const deleteBtn = item.querySelector('.hi-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (event) => {
            console.log('Dashboard: Deleting conversation:', conversation.id);
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

  function deleteConv(event, id) {
    event.stopPropagation();
    conversations = conversations.filter((conversation) => conversation.id !== id);

    if (activeId === id) {
      if (conversations.length > 0) {
        loadConv(conversations[0].id);
      } else {
        activeId = null;
        chatTitle.textContent = 'New Conversation';
        renderMessages([], messages);
      }
    }

    renderHistory(conversations, historyList, searchInput, activeId);
  }

async function callLLM(messageList) {
  console.log('Dashboard: callLLM called with messages:', messageList);
  
  try {
    console.log('Dashboard: Making fetch request to /api/chat');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: messageList })
    });

    console.log('Dashboard: Fetch response status:', response.status, response.ok);
    const data = await response.json();
    console.log('Dashboard: Fetch response data:', data);

    if (!response.ok) {
      console.error('Dashboard: Response not ok:', data.message);
      throw new Error(data.message || 'Unable to reach the AI service.');
    }

    const reply = data.reply || data.response || 'No response was returned.';
    console.log('Dashboard: Returning reply:', reply);
    return reply;
  } catch (error) {
    console.error('Dashboard: callLLM error:', error);
    throw error;
  }
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
    callLLM
  };
}

// Global variables for the dashboard
let conversations = [];
let activeId = null;
let historyList, searchInput, newChatButton, chatTitle, messages, typingIndicator, textarea, sendButton;

// Global function to send message
async function sendMessage() {
  console.log('Dashboard: sendMessage called');
  if (!textarea) {
    console.log('Dashboard: textarea not initialized yet');
    return;
  }
  
  const text = textarea.value.trim();
  console.log('Dashboard: Input text -', text);
  
  if (!text) {
    console.log('Dashboard: No text, returning');
    return;
  }

  textarea.value = '';
  textarea.style.height = 'auto';

  if (!activeId) {
    console.log('Dashboard: No active chat, creating new chat');
    newChat();
  }

  const conversation = getConv(conversations, activeId);
  if (!conversation) {
    console.log('Dashboard: No conversation found for activeId', activeId);
    return;
  }

  console.log('Dashboard: Found conversation', conversation);

  if (conversation.messages.length === 0) {
    conversation.title = autoTitle(text);
    chatTitle.textContent = conversation.title;
  }

  conversation.messages.push({ role: 'user', content: text });
  conversation.updatedAt = Date.now();
  appendBubble('user', text, true, messages);
  renderHistory(conversations, historyList, searchInput, activeId);

  console.log('Dashboard: Showing typing indicator');
  typingIndicator.classList.add('show');
  typingIndicator.setAttribute('aria-hidden', 'false');
  messages.scrollTop = messages.scrollHeight;

  let reply = '';

  try {
    console.log('Dashboard: Calling LLM with messages', conversation.messages);
    reply = await callLLM(conversation.messages);
    console.log('Dashboard: LLM reply received', reply);
  } catch (error) {
    console.error('Dashboard: LLM call failed', error);
    reply = 'Unable to reach the AI right now. Please check the API configuration and try again.';
  }

  console.log('Dashboard: Hiding typing indicator');
  typingIndicator.classList.remove('show');
  typingIndicator.setAttribute('aria-hidden', 'true');

  conversation.messages.push({ role: 'assistant', content: reply });
  conversation.updatedAt = Date.now();
  appendBubble('assistant', reply, true, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
  console.log('Dashboard: Message exchange complete');
}

// Global function to create new chat
function newChat() {
  console.log('Dashboard: Creating new chat');
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
function loadConv(id) {
  console.log('Dashboard: Loading conversation', id);
  activeId = id;
  const conversation = getConv(conversations, id);

  if (!conversation) {
    chatTitle.textContent = 'New Conversation';
    renderMessages([], messages);
    renderHistory(conversations, historyList, searchInput, activeId);
    return;
  }

  chatTitle.textContent = conversation.title;
  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
}

// Browser initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard: DOM loaded');
    
    // Initialize DOM elements
    historyList = document.getElementById('history-list');
    searchInput = document.getElementById('search-input');
    newChatButton = document.getElementById('new-chat-btn');
    chatTitle = document.getElementById('chat-title');
    messages = document.getElementById('messages');
    typingIndicator = document.getElementById('typing-indicator');
    textarea = document.getElementById('user-input');
    sendButton = document.getElementById('send-btn');

    console.log('Dashboard: Elements found -', {
      historyList: !!historyList,
      searchInput: !!searchInput,
      newChatButton: !!newChatButton,
      chatTitle: !!chatTitle,
      messages: !!messages,
      typingIndicator: !!typingIndicator,
      textarea: !!textarea,
      sendButton: !!sendButton
    });

  textarea.addEventListener('input', function handleInput() {
    this.style.height = 'auto';
    this.style.height = `${Math.min(this.scrollHeight, 120)}px`;
  });

  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      console.log('Dashboard: Enter key pressed');
      event.preventDefault();
      sendMessage();
    }
  });

  sendButton.addEventListener('click', () => {
    console.log('Dashboard: Send button clicked');
    sendMessage();
  });
  newChatButton.addEventListener('click', newChat);
  searchInput.addEventListener('input', () => renderHistory(conversations, historyList, searchInput, activeId));

  console.log('Dashboard: Event listeners attached');
  renderHistory(conversations, historyList, searchInput, activeId);
  setEmptyState(messages);
});
}
