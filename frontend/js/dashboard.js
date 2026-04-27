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

  let currentMultiCol = null;

  messageList.forEach((msg) => {
    if (msg.role === 'assistant') {
      if (!currentMultiCol) {
        currentMultiCol = document.createElement ? document.createElement('div') : { innerHTML: '', appendChild: function(){} };
        currentMultiCol.className = 'msg-row assistant multi-col';
        currentMultiCol.innerHTML = '<div class="avatar bot">AI</div><div class="multi-col-wrapper" style="width:100%; display:flex; gap:16px;"></div>';
        if (container.appendChild) { container.appendChild(currentMultiCol); }
      }
      const wrapper = currentMultiCol.querySelector ? currentMultiCol.querySelector('.multi-col-wrapper') : null;
      const col = document.createElement ? document.createElement('div') : { innerHTML: '', className: '' };
      col.className = 'model-col';
      col.innerHTML = `
        <div class="model-col-header">
           <span>Assistant</span>
           <span class="model-badge">${escapeHtml(msg.model_name || 'AI Model')}</span>
        </div>

        <div class="model-col-content bubble" data-content="${encodeURIComponent(msg.content)}">
          ${formatMessage(msg.content)}
        </div>

        <div class="msg-actions" style="margin-top:10px; display:flex; gap:10px;">
          <button class="copy-btn" data-content="${encodeURIComponent(msg.content)}">📋 Copy</button>
        </div>
      `;
      if (wrapper && wrapper.appendChild) wrapper.appendChild(col);
      else if (currentMultiCol.appendChild) currentMultiCol.appendChild(col);
    } else {
      currentMultiCol = null;
      appendBubble('user', msg.content, false, container);
    }
  });

  if (container.scrollTop !== undefined) {
    container.scrollTop = container.scrollHeight;
  }

  //use set timeout to let the DOM refresh
  setTimeout(() => {
    if (container && container.querySelectorAll) {
      const copyBtns = container.querySelectorAll('.copy-btn');

      copyBtns.forEach(btn => {
        btn.onclick = async () => {
          const text = decodeURIComponent(btn.dataset.content);
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "📋 Copy"), 1000);
        };
      });
    }
  }, 0);

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

if (typeof document !== 'undefined') {
  document.getElementById('resend-btn').addEventListener('click', () => {
    const conversation = getConv(conversations, activeId);
    if (!conversation || !conversation.messages.length) return;

    // find last user message
    let lastUserMessage = null;

    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        lastUserMessage = conversation.messages[i];
        break;
      }
    }

    if (!lastUserMessage) return;

    // put it back into textarea
    textarea.value = lastUserMessage.content;
    textarea.focus();

    // optional UX: expand textarea height
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  });
}

async function callLLM(messageList) {
  console.log('Dashboard: callLLM multi called');
  // Strip out model_name from messages before sending
  const cleanMsgs = messageList.map(m => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch('/api/chat/multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: cleanMsgs, modelNames: selectedModels, level: level })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data.replies || [];
  } catch (error) {
    console.error('LLM error:', error);
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
let selectedModels = [];
let level = 0; //NONE
let settingsModal, settingsBtn, cancelSettingsBtn, saveSettingsBtn, modelListDiv;
let activeId = null;
let historyList, searchInput, newChatButton, chatTitle, messages, typingIndicator, textarea, sendButton;


//setup the level radio buttons
const levelMap = {
  default: 0,
  child: 1,
  beginner: 2,
  expert: 3
};

if (typeof document !== 'undefined') {
  document.querySelectorAll('input[name="level"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        level = levelMap[e.target.value];
        console.log("Level set to:", level);
      }
    });
  });
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
          model_name: msg.model_name || null,
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
async function saveMessageToServer(conversationId, role, content, model_name = null) {
  try {
    console.log('Dashboard: Saving message to server:', conversationId, role);
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role, content, model_name })
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
  if (!textarea || !textarea.value.trim()) return;
  const text = textarea.value.trim();
  textarea.value = ''; textarea.style.height = 'auto';

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
  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
  await saveMessageToServer(activeId, 'user', text);

  typingIndicator.classList.add('show');
  typingIndicator.setAttribute('aria-hidden', 'false');
  messages.scrollTop = messages.scrollHeight;

  try {
    const replies = await callLLM(conversation.messages);
    typingIndicator.classList.remove('show');
    typingIndicator.setAttribute('aria-hidden', 'true');

    for (const rep of replies) {
        if (!rep.error && rep.content) {
             conversation.messages.push({ role: 'assistant', content: rep.content, model_name: rep.model });
             await saveMessageToServer(activeId, 'assistant', rep.content, rep.model);
        }
    }
    conversation.updatedAt = Date.now();
  } catch (error) {
    typingIndicator.classList.remove('show');
    typingIndicator.setAttribute('aria-hidden', 'true');
    conversation.messages.push({ role: 'assistant', content: 'Connection Error', model_name: 'System' });
  }

  renderMessages(conversation.messages, messages);
  renderHistory(conversations, historyList, searchInput, activeId);
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

    settingsModal = document.getElementById('settings-modal');
    settingsBtn = document.getElementById('settings-btn');
    cancelSettingsBtn = document.getElementById('cancel-settings');
    saveSettingsBtn = document.getElementById('save-settings');
    modelListDiv = document.getElementById('model-list');

    // Load available models and display grouped by Cloud vs Local!
    fetch('/api/models').then(r => r.json()).then(data => {
      const models = (data.models || []).map(m => m.name || m);
      if(models.length > 0) {
        selectedModels = models.slice(0, 3);
        let cloudHTML = '';
        let localHTML = '';
        models.forEach(modelName => {
           const isCloud = modelName.includes(':') && (modelName.startsWith('openai:') || modelName.startsWith('gemini:') || modelName.startsWith('claude:'));
           const box = `<label><input type="checkbox" value="${modelName}" ${selectedModels.includes(modelName)?'checked':''}> ${modelName}</label><br>`;
           if (isCloud) cloudHTML += box;
           else localHTML += box;
        });

        let fullHTML = '';
        if (cloudHTML) fullHTML += '<h4 style="margin: 4px; font-size: 11px; text-transform: uppercase; color: #888;">☁️ Cloud API Models</h4>' + cloudHTML;
        if (localHTML) fullHTML += '<h4 style="margin: 4px; font-size: 11px; border-top: 1px solid #444; padding-top: 5px; text-transform: uppercase; color: #888;">🦙 Local Models</h4>' + localHTML;

        modelListDiv.innerHTML = fullHTML;
      } else {
        modelListDiv.innerHTML = 'No models detected.';
      }
    }).catch(e => console.error(e));

    if(settingsBtn) settingsBtn.addEventListener('click', () => { settingsModal.classList.add('show'); });
    if(cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => { settingsModal.classList.remove('show'); });
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
       const checked = Array.from(modelListDiv.querySelectorAll('input:checked')).map(cb => cb.value);

       if(checked.length === 0) { alert('Please select at least 1 model.'); return; }
       selectedModels = checked;
       settingsModal.classList.remove('show');
    });


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
