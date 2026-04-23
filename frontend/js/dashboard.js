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

function getSelectedModels() {
  const checked = document.querySelectorAll('#model-picker input[type="checkbox"]:checked');
  return Array.from(checked).map((input) => input.value);
}

async function callLLM(messageList, selectedModels = []) {
  console.log('Dashboard: callLLM called with messages:', messageList, 'models:', selectedModels);

  try {
    console.log('Dashboard: Making fetch request to /api/chat');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messageList,
        models: selectedModels
      })
    });

    console.log('Dashboard: Fetch response status:', response.status, response.ok);
    const data = await response.json();
    console.log('Dashboard: Fetch response data:', data);

    if (!response.ok) {
      console.error('Dashboard: Response not ok:', data.message);
      throw new Error(data.message || 'Unable to reach the AI service.');
    }

    if (Array.isArray(data.responses)) {
      return data.responses;
    }

    const singleReply = data.reply || data.response || 'No response was returned.';
    return [{ model: 'default', content: singleReply }];
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
  callLLM,
  getSelectedModels
};
}

// Global variables for the dashboard
let conversations = [];
let activeId = null;
let historyList, searchInput, newChatButton, chatTitle, messages, typingIndicator, textarea, sendButton;

// Load conversations from server
async function loadConversationsFromServer() {
  try {
    console.log('Dashboard: Loading conversations from server');
    const response = await fetch('/api/conversations');
    
    console.log('Dashboard: Load conversations response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Dashboard: Load conversations response:', data);
      conversations = data.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: [], // Will be loaded separately
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime(),
        messageCount: conv.message_count
      }));
      console.log('Dashboard: Loaded conversations:', conversations);
    } else {
      const errorData = await response.json();
      console.log('Dashboard: Failed to load conversations:', response.status, errorData);
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
    console.log('Dashboard: Loading messages for conversation:', conversationId);
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    
    if (response.ok) {
      const data = await response.json();
      const conversation = getConv(conversations, conversationId);
      if (conversation) {
        conversation.messages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime()
        }));
        console.log('Dashboard: Loaded messages:', conversation.messages.length);
      }
    } else {
      console.error('Dashboard: Failed to load messages:', response.status);
    }
  } catch (error) {
    console.error('Dashboard: Error loading messages:', error);
  }
}

// Save conversation to server
async function saveConversationToServer(conversation) {
  try {
    console.log('Dashboard: Saving conversation to server:', conversation.id, conversation.title);
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: conversation.id,
        title: conversation.title
      })
    });
    
    console.log('Dashboard: Save conversation response status:', response.status);
    const responseData = await response.json();
    console.log('Dashboard: Save conversation response:', responseData);
    
    if (!response.ok) {
      console.error('Dashboard: Failed to save conversation:', responseData);
    } else {
      console.log('Dashboard: Conversation saved successfully');
    }
  } catch (error) {
    console.error('Dashboard: Error saving conversation:', error);
  }
}

// Save message to server
async function saveMessageToServer(conversationId, role, content, modelName = null) {
  try {
    console.log('Dashboard: Saving message to server:', conversationId, role);
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
  role: role,
  content: content,
  model_name: modelName
})
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
    console.log('Dashboard: Deleting conversation from server:', conversationId);
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      console.error('Dashboard: Failed to delete conversation:', response.status);
    }
  } catch (error) {
    console.error('Dashboard: Error deleting conversation:', error);
  }
}

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

  // If this is a new conversation, save it to server first
  if (conversation.messages.length === 0) {
    conversation.title = autoTitle(text);
    chatTitle.textContent = conversation.title;
    await saveConversationToServer(conversation);
  }

  conversation.messages.push({ role: 'user', content: text });
  conversation.updatedAt = Date.now();
  appendBubble('user', text, true, messages);
  renderHistory(conversations, historyList, searchInput, activeId);

  // Save user message to server
  await saveMessageToServer(activeId, 'user', text);

  console.log('Dashboard: Showing typing indicator');
  typingIndicator.classList.add('show');
  typingIndicator.setAttribute('aria-hidden', 'false');
  messages.scrollTop = messages.scrollHeight;

 let replies = [];

try {
  const selectedModels = getSelectedModels();
  console.log('Dashboard: Calling LLM with messages', conversation.messages, 'and models', selectedModels);
  replies = await callLLM(conversation.messages, selectedModels);
  console.log('Dashboard: LLM replies received', replies);
} catch (error) {
  console.error('Dashboard: LLM call failed', error);
  replies = [
    {
      model: 'system',
      content: 'Unable to reach the AI right now. Please check the API configuration and try again.'
    }
  ];
}

console.log('Dashboard: Hiding typing indicator');
typingIndicator.classList.remove('show');
typingIndicator.setAttribute('aria-hidden', 'true');

for (const replyObj of replies) {
  const labeledReply = `[${replyObj.model}] ${replyObj.content}`;
  conversation.messages.push({ role: 'assistant', content: labeledReply });
  conversation.updatedAt = Date.now();
  appendBubble('assistant', labeledReply, true, messages);

  // Save assistant message to server
  await saveMessageToServer(activeId, 'assistant', labeledReply, replyObj.model);
}

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
async function loadConv(id) {
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
  
  // Load messages from server if not already loaded
  if (conversation.messages.length === 0 && conversation.messageCount > 0) {
    await loadMessagesFromServer(id);
  }
  
  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
}

// Global function to delete conversation
async function deleteConv(event, id) {
  event.stopPropagation();
  
  // Delete from server first
  await deleteConversationFromServer(id);
  
  // Remove from client-side array
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
  
  // Load conversations from server on page load
  loadConversationsFromServer().then(() => {
    renderHistory(conversations, historyList, searchInput, activeId);
    if (conversations.length === 0) {
      setEmptyState(messages);
    }
  });
});
}
