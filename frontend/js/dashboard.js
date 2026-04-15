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

function appendMultiModelBubble(content, modelName, animate = true, messagesContainer) {
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
  
  row.className = 'msg-row assistant multi-model';

  if (!animate) {
    row.style.animation = 'none';
  }

  const normalizedContent = String(content).replace(/^(?:\r?\n)+/, '');

  row.innerHTML = `
    <div class="avatar bot">AI</div>
    <div class="multi-bubble">
      <div class="model-label">${escapeHtml(modelName)}</div>
      <div class="bubble">${formatMessage(normalizedContent)}</div>
    </div>
  `;

  if (container.appendChild) {
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }
  return row;
}

function showTransientAssistantBubble(content, messagesContainer, options = {}) {
  const container = messagesContainer || messages;
  const row = appendBubble('assistant', content, false, container);
  const totalDurationMs = Number.isFinite(options.totalDurationMs) ? options.totalDurationMs : 1000;
  const fadeDurationMs = Number.isFinite(options.fadeDurationMs) ? options.fadeDurationMs : 500;
  const fadeStartDelayMs = Math.max(0, totalDurationMs - fadeDurationMs);

  row.classList.add('transient-warning');
  row.style.setProperty('--transient-fade-duration', `${fadeDurationMs}ms`);

  setTimeout(() => {
    if (!row.parentNode) {
      return;
    }
    requestAnimationFrame(() => {
      row.classList.add('fade-out');
    });
  }, fadeStartDelayMs);

  setTimeout(() => {
    if (row.parentNode) {
      row.parentNode.removeChild(row);
    }

    if (container.querySelectorAll && container.querySelectorAll('.msg-row').length === 0) {
      setEmptyState(container);
    }
  }, totalDurationMs);
}

function renderMessages(messageList, messagesContainer) {
  const container = messagesContainer || messages;
  container.innerHTML = '';

  if (!messageList || messageList.length === 0) {
    setEmptyState(container);
    return;
  }

  messageList.forEach((message) => {
    // If message has model attribution (from multi-model conversation), render as multi-bubble
    if (message.model && message.role === 'assistant') {
      appendMultiModelBubble(message.content, message.model, false, container);
    } else {
      // Legacy messages or user messages use regular bubble
      appendBubble(message.role, message.content, false, container);
    }
  });
  
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

async function callLLM(messageList, selectedModels = [], abortSignal = null) {
  console.log('Dashboard: callLLM called with messages:', messageList, 'models:', selectedModels);
  
  try {
    console.log('Dashboard: Making fetch request to /api/chat');
    
    if (!selectedModels || selectedModels.length < 1) {
      throw new Error('Please select at least one model.');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: abortSignal,
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

    // Handle new multi-model response format
    if (data.responses && Array.isArray(data.responses)) {
      console.log('Dashboard: Returning multi-model responses:', data.responses);
      return data.responses;
    }

    // Fallback for backward compatibility
    const reply = data.reply || data.response || 'No response was returned.';
    console.log('Dashboard: Returning legacy reply:', reply);
    return reply;
  } catch (error) {
    console.error('Dashboard: callLLM error:', error);
    throw error;
  }
}

async function loadAvailableModels() {
  console.log('Dashboard: Loading available models');
  try {
    const response = await fetch('/api/models');
    if (response.ok) {
      const data = await response.json();
      const models = Array.isArray(data) ? data : (data.models || []);
      console.log('Dashboard: Available models:', models);
      
      const modelList = document.getElementById('model-list');
      if (modelList) {
        modelList.innerHTML = '';
        
        models.forEach(model => {
          // Extract model name - handle both string and object formats
          const modelName = typeof model === 'string' ? model : (model.name || model);
          
          const modelItem = document.createElement('div');
          modelItem.className = 'model-item';
          modelItem.id = `model-item-${modelName}`;
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `model-checkbox-${modelName}`;
          checkbox.value = modelName;
          checkbox.addEventListener('change', handleCheckboxChange);
          
          const label = document.createElement('label');
          label.htmlFor = `model-checkbox-${modelName}`;
          label.textContent = modelName;
          // Ensure label click toggles checkbox
          label.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            checkbox.checked = !checkbox.checked;
            handleCheckboxChange({ target: checkbox });
          });
          
          modelItem.appendChild(checkbox);
          modelItem.appendChild(label);
          
          // Make entire item clickable to toggle checkbox
          modelItem.addEventListener('click', (event) => {
            event.stopPropagation();
            if (event.target !== checkbox && event.target !== label) {
              checkbox.checked = !checkbox.checked;
              handleCheckboxChange({ target: checkbox });
            }
          });
          
          modelList.appendChild(modelItem);
        });
        renderModelListUI();
      }
    } else {
      console.error('Dashboard: Failed to load models');
    }
  } catch (error) {
    console.error('Dashboard: Error loading models:', error);
  }
}

function handleModelSelection(modelName, isChecked) {
  console.log(`Dashboard: Model ${modelName} selection changed to ${isChecked}`);
  
  if (isChecked) {
    // Enforce max 2 models
    if (selectedModels.length >= 2) {
      console.log('Dashboard: Max 2 models reached, rejecting selection of third model');
      // Reject the third model by unchecking it
      const newCheckbox = document.getElementById(`model-checkbox-${modelName}`);
      if (newCheckbox) {
        newCheckbox.removeEventListener('change', handleCheckboxChange);
        newCheckbox.checked = false;
        newCheckbox.addEventListener('change', handleCheckboxChange);
      }
      return; // Don't add to selectedModels
    } else {
      selectedModels.push(modelName);
    }
  } else {
    selectedModels = selectedModels.filter(m => m !== modelName);
  }
  
  console.log('Dashboard: Updated selectedModels:', selectedModels);
  renderModelListUI();
}

function handleCheckboxChange(event) {
  const checkbox = event.target;
  const modelName = checkbox.value;
  handleModelSelection(modelName, checkbox.checked);
}

function renderModelListUI() {
  console.log('Dashboard: Rendering model list UI, selectedModels:', selectedModels);
  
  // Update model items to show selection state
  const modelItems = document.querySelectorAll('.model-item');
  console.log('Dashboard: Found', modelItems.length, 'model items');
  modelItems.forEach((item, idx) => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox) {
      const isSelected = selectedModels.includes(checkbox.value);
      console.log(`Dashboard: Model item ${idx} (${checkbox.value}): isSelected=${isSelected}`);
      if (isSelected) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
  });
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
    appendMultiModelBubble,
    renderMessages,
    renderHistory,
    handleModelSelection,
    renderModelListUI,
    loadAvailableModels,
    callLLM
  };
}

// Global variables for the dashboard
let conversations = [];
let activeId = null;
let selectedModels = [];
let isGenerating = false;
let activeChatAbortController = null;
const defaultInputPlaceholder = 'Type your message...';
const generatingInputPlaceholder = 'Esc to stop response';
let historyList, searchInput, newChatButton, chatTitle, messages, typingIndicator, textarea, sendButton, modelDropdownBtn, modelDropdownContent, inputRow;

function setGenerationState(isActive) {
  isGenerating = isActive;

  if (textarea) {
    textarea.disabled = isActive;
    textarea.placeholder = isActive ? generatingInputPlaceholder : defaultInputPlaceholder;
  }

  if (sendButton) {
    sendButton.disabled = isActive;
  }

  if (inputRow) {
    inputRow.classList.toggle('is-generating', isActive);
  }
}

function stopGeneration() {
  if (!isGenerating || !activeChatAbortController) {
    return false;
  }

  activeChatAbortController.abort();
  return true;
}

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
          model: msg.model_name || null,
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
async function saveMessageToServer(conversationId, role, content, model = null) {
  try {
    console.log('Dashboard: Saving message to server:', conversationId, role, 'model:', model);
    const body = {
      role: role,
      content: content
    };
    
    // Include model if provided (for multi-model responses)
    if (model) {
      body.model_name = model;
    }
    
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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

  if (isGenerating) {
    console.log('Dashboard: Ignoring send while generation is in progress');
    return;
  }
  
  const text = textarea.value.trim();
  console.log('Dashboard: Input text -', text);
  
  if (!text) {
    console.log('Dashboard: No text, returning');
    return;
  }

  if (selectedModels.length < 1) {
    showTransientAssistantBubble('Please select at least one model before sending your prompt.', messages, {
      totalDurationMs: 1500,
      fadeDurationMs: 500
    });
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

  const isNewConversation = conversation.messages.length === 0;
  const previousUpdatedAt = conversation.updatedAt;

  // Set title immediately for UX; persistence happens after a non-cancelled response.
  if (isNewConversation) {
    conversation.title = autoTitle(text);
    chatTitle.textContent = conversation.title;
  }

  const userMessage = { role: 'user', content: text };
  conversation.messages.push(userMessage);
  conversation.updatedAt = Date.now();
  const userBubbleRow = appendBubble('user', text, true, messages);
  renderHistory(conversations, historyList, searchInput, activeId);

  console.log('Dashboard: Showing typing indicator');
  typingIndicator.classList.add('show');
  typingIndicator.setAttribute('aria-hidden', 'false');
  messages.scrollTop = messages.scrollHeight;

  let reply = null;
  setGenerationState(true);
  activeChatAbortController = new AbortController();

  try {
    console.log('Dashboard: Calling LLM with messages', conversation.messages, 'selectedModels:', selectedModels);
    reply = await callLLM(conversation.messages, selectedModels, activeChatAbortController.signal);
    console.log('Dashboard: LLM reply received', reply);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.log('Dashboard: LLM request cancelled by user');
      reply = null;
    } else {
      console.error('Dashboard: LLM call failed', error);
      reply = error && error.message
        ? `AI request failed: ${error.message}`
        : 'Unable to reach the AI right now. Please check the API configuration and try again.';
    }
  } finally {
    setGenerationState(false);
    activeChatAbortController = null;

    console.log('Dashboard: Hiding typing indicator');
    typingIndicator.classList.remove('show');
    typingIndicator.setAttribute('aria-hidden', 'true');
  }

  if (reply === null) {
    const userMessageIndex = conversation.messages.lastIndexOf(userMessage);
    if (userMessageIndex >= 0) {
      conversation.messages.splice(userMessageIndex, 1);
    }

    if (userBubbleRow && userBubbleRow.parentNode) {
      userBubbleRow.parentNode.removeChild(userBubbleRow);
    }

    conversation.updatedAt = previousUpdatedAt;
    renderHistory(conversations, historyList, searchInput, activeId);

    showTransientAssistantBubble('Response stopped.', messages, {
      totalDurationMs: 2000,
      fadeDurationMs: 500
    });

    return;
  }

  if (isNewConversation) {
    await saveConversationToServer(conversation);
  }

  // Save user message to server only after response is not cancelled.
  await saveMessageToServer(activeId, 'user', text);

  // Handle both single response and multi-model responses
  if (Array.isArray(reply)) {
    // Multi-model responses
    console.log('Dashboard: Handling multi-model responses');
    reply.forEach((response) => {
      conversation.messages.push({ role: 'assistant', content: response.content, model: response.model });
      appendMultiModelBubble(response.content, response.model, true, messages);
      saveMessageToServer(activeId, 'assistant', response.content, response.model);
    });
  } else {
    // Single response (legacy)
    console.log('Dashboard: Handling single response');
    conversation.messages.push({ role: 'assistant', content: reply });
    appendBubble('assistant', reply, true, messages);
    saveMessageToServer(activeId, 'assistant', reply);
  }

  conversation.updatedAt = Date.now();
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
    inputRow = document.getElementById('input-row');
    textarea = document.getElementById('user-input');
    sendButton = document.getElementById('send-btn');
    modelDropdownBtn = document.getElementById('model-dropdown-btn');
    modelDropdownContent = document.getElementById('model-dropdown-content');

    console.log('Dashboard: Elements found -', {
      historyList: !!historyList,
      searchInput: !!searchInput,
      newChatButton: !!newChatButton,
      chatTitle: !!chatTitle,
      messages: !!messages,
      typingIndicator: !!typingIndicator,
      inputRow: !!inputRow,
      textarea: !!textarea,
      sendButton: !!sendButton,
      modelDropdownBtn: !!modelDropdownBtn,
      modelDropdownContent: !!modelDropdownContent
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isGenerating) {
      event.preventDefault();
      if (stopGeneration()) {
        console.log('Dashboard: Esc pressed, stopping generation');
      }
    }
  });

  sendButton.addEventListener('click', () => {
    console.log('Dashboard: Send button clicked');
    sendMessage();
  });

  // Setup model selector dropdown
  modelDropdownBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = modelDropdownContent.hasAttribute('hidden');
    if (isHidden) {
      modelDropdownContent.removeAttribute('hidden');
      modelDropdownBtn.setAttribute('aria-expanded', 'true');
      console.log('Dashboard: Model dropdown opened');
    } else {
      modelDropdownContent.setAttribute('hidden', '');
      modelDropdownBtn.setAttribute('aria-expanded', 'false');
      console.log('Dashboard: Model dropdown closed');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (!modelDropdownContent.hasAttribute('hidden')) {
      modelDropdownContent.setAttribute('hidden', '');
      modelDropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });

  newChatButton.addEventListener('click', newChat);
  searchInput.addEventListener('input', () => renderHistory(conversations, historyList, searchInput, activeId));

  console.log('Dashboard: Event listeners attached');
  
  // Load available models
  loadAvailableModels();
  
  // Load conversations from server on page load
  loadConversationsFromServer().then(() => {
    renderHistory(conversations, historyList, searchInput, activeId);
    if (conversations.length === 0) {
      setEmptyState(messages);
    }
  });
});
}
