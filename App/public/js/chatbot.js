document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatHistory = document.getElementById('chatHistory');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const documentUpload = document.getElementById('documentUpload');
    const modelSelector = document.getElementById('model');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const welcomeSection = document.getElementById('welcomeSection');
    const quickPrompts = document.querySelectorAll('.quick-prompt');
    const fileName = document.getElementById('fileName');
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyPanel = document.getElementById('historyPanel');
    const historyList = document.getElementById('historyList');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // State
    let currentConversationId = null;
    let isProcessing = false;

    // Initialize
    init();

    // Event Listeners
    messageInput.addEventListener('keydown', handleMessageInputKeydown);
    messageInput.addEventListener('input', adjustTextareaHeight);
    sendBtn.addEventListener('click', sendMessage);
    uploadBtn.addEventListener('click', () => documentUpload.click());
    documentUpload.addEventListener('change', handleFileUpload);
    clearChatBtn.addEventListener('click', startNewConversation);
    exportChatBtn.addEventListener('click', exportConversation);
    quickPrompts.forEach(btn => {
        btn.addEventListener('click', handleQuickPrompt);
    });
    showHistoryBtn.addEventListener('click', toggleHistoryPanel);
    closeHistoryBtn.addEventListener('click', toggleHistoryPanel);
    overlay.addEventListener('click', toggleHistoryPanel);

    // Conversation history delegation
    historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-history-btn') || e.target.closest('.delete-history-btn')) {
            e.stopPropagation();
            const convId = e.target.closest('.delete-history-btn').dataset.id;
            deleteConversation(convId);
        } else if (e.target.classList.contains('history-item') || e.target.closest('.history-item')) {
            const convId = e.target.closest('.history-item').dataset.id;
            loadConversation(convId);
            toggleHistoryPanel();
        }
    });

modelSelector.addEventListener('change', () => {
    localStorage.setItem('selectedModel', modelSelector.value);
});
    // Initialize the app
function init() {
    adjustTextareaHeight();

    // Check URL for conversation ID (if someone shares a link)
    const urlParams = new URLSearchParams(window.location.search);
    const convId = urlParams.get('conversation');

    const welcomeInput = document.getElementById('welcomeInput');
    if (welcomeInput) {
        welcomeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && welcomeInput.value.trim()) {
                startChatFromWelcome(welcomeInput.value.trim());
            }
        });

        welcomeInput.addEventListener('focus', () => {
            welcomeInput.placeholder = 'Type your message and press Enter...';
        });

        welcomeInput.addEventListener('blur', () => {
            welcomeInput.placeholder = 'Start a conversation or upload a document to get started...';
        });
    }
    if (convId) {
        loadConversation(convId);
    } else if (!currentConversationId) {
        welcomeSection.style.display = 'flex';
        chatHistory.innerHTML = '';
    }

    // Load saved model preference
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && Array.from(modelSelector.options).some(opt => opt.value === savedModel)) {
        modelSelector.value = savedModel;
    }
}

function startChatFromWelcome(message) {
    const welcomeSection = document.getElementById('welcomeSection');
    const chatHistory = document.getElementById('chatHistory');
    const messageInput = document.getElementById('messageInput');

    // Animate the welcome section out
    welcomeSection.classList.add('hide');

    // After animation completes, focus the main input
    setTimeout(() => {
        welcomeSection.style.display = 'none';
        messageInput.value = message;
        adjustTextareaHeight();
        sendMessage();

        // Smooth scroll to the bottom of the chat
        chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }, 500);
}

    // Toggle history panel
    function toggleHistoryPanel() {
        historyPanel.classList.toggle('open');
        overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
    }



    // Start a new conversation
// Start a new conversation
function startNewConversation() {
    currentConversationId = null;
    chatHistory.innerHTML = '';

    // Reset URL if it has a conversation parameter
    if (window.location.search.includes('conversation')) {
        window.history.pushState({}, '', window.location.pathname);
    }

    // Ensure welcome section is properly shown
    welcomeSection.classList.remove('hide');
    welcomeSection.style.display = 'flex';

    // Focus the welcome input if it exists, otherwise the main input
    const welcomeInput = document.getElementById('welcomeInput');
    if (welcomeInput) {
        welcomeInput.focus();
    } else {
        messageInput.focus();
    }
}

    // Handle quick prompt
function handleQuickPrompt(e) {
    const prompt = e.target.dataset.prompt;
    if (welcomeSection.style.display !== 'none') {
        startChatFromWelcome(prompt);
    } else {
        messageInput.value = prompt;
        adjustTextareaHeight();
        sendMessage();
    }
}

    // Load a conversation by ID
    async function loadConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversation/${conversationId}`);
            if (!response.ok) throw new Error('Failed to load conversation');

            const data = await response.json();
            currentConversationId = conversationId;

            // Update UI
            renderConversation(data.messages);
            welcomeSection.style.display = 'none';

            // Update active state in history list
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === conversationId);
            });

        } catch (error) {
            console.error('Error loading conversation:', error);
            showError('Failed to load conversation');
        }
    }

    // Delete a conversation
    async function deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            const response = await fetch(`/api/conversation/${conversationId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete conversation');

            // Remove from UI
            const item = document.querySelector(`.history-item[data-id="${conversationId}"]`);
            if (item) item.remove();

            // If we deleted the current conversation, start a new one
            if (currentConversationId === conversationId) {
                startNewConversation();
            }

        } catch (error) {
            console.error('Error deleting conversation:', error);
            showError('Failed to delete conversation');
        }
    }

    // Export conversation
    function exportConversation() {
        if (!currentConversationId || chatHistory.children.length === 0) {
            showError('No conversation to export');
            return;
        }

        let exportText = `AI Chat Conversation\n\n`;
        const messages = chatHistory.querySelectorAll('.message');

        messages.forEach(msg => {
            const role = msg.classList.contains('user-message') ? 'You' : 'AI';
            const content = msg.querySelector('.message-content').textContent;
            const time = msg.querySelector('.message-time')?.textContent || '';

            exportText += `${role} (${time}):\n${content}\n\n`;
        });

        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-${currentConversationId.slice(0, 8)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Render conversation messages
    function renderConversation(messages) {
        chatHistory.innerHTML = '';

        if (messages.length === 0) {
            welcomeSection.style.display = 'flex';
            return;
        }

        welcomeSection.style.display = 'none';

        messages.forEach(message => {
            addMessageToChat(message.role, message.content, new Date(message.timestamp));
        });
    }

    // Handle message input keydown
    function handleMessageInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Adjust textarea height based on content
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
    }

    // Send message to AI
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isProcessing) return;

    // Add user message to chat
    addMessageToChat('user', message);
    messageInput.value = '';
    adjustTextareaHeight();
    isProcessing = true;
    sendBtn.disabled = true;

    // Show loading indicator
    const loadingId = showLoadingIndicator();

    try {
        const model = modelSelector.value;
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                model,
                conversationId: currentConversationId
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // Update current conversation ID if this is a new conversation
        if (!currentConversationId && data.conversationId) {
            currentConversationId = data.conversationId;
            // Update URL to include conversation ID
            window.history.pushState({}, '', `?conversation=${data.conversationId}`);
            // Add to history panel
            const convName = `Chat ${new Date().toLocaleTimeString()}`;
            addConversationToHistory(data.conversationId, convName);
        }

        // Remove loading indicator and add AI response
        removeLoadingIndicator(loadingId);
        addMessageToChat('ai', data.response);

        // Hide welcome section
        welcomeSection.style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        removeLoadingIndicator(loadingId);
        addMessageToChat('ai', 'Sorry, I encountered an error processing your request. Please try again.');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Add this new function to add conversations to history panel
function addConversationToHistory(conversationId, conversationName) {
    // Check if it already exists
    if (document.querySelector(`.history-item[data-id="${conversationId}"]`)) return;

    const historyItem = document.createElement('div');
    historyItem.className = 'history-item active';
    historyItem.dataset.id = conversationId;
    historyItem.innerHTML = `
        <lord-icon
            src="https://cdn.lordicon.com/vspbqszr.json"
            trigger="hover"
            colors="primary:#f54266"
            style="width:20px;height:20px">
        </lord-icon>
        <span>${conversationName}</span>
        <button class="delete-history-btn" data-id="${conversationId}">
            <i class="fas fa-trash"></i>
        </button>
    `;

    // Insert at the top of the list
    historyList.insertBefore(historyItem, historyList.firstChild);

    // Remove active class from other items
    document.querySelectorAll('.history-item').forEach(item => {
        if (item !== historyItem) item.classList.remove('active');
    });
}

    // Handle file upload
    async function handleFileUpload() {
        if (!documentUpload.files.length) return;

        const file = documentUpload.files[0];
        fileName.textContent = file.name;

        // Show uploading indicator
        const originalText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('document', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();

            // Add document info to chat
            addMessageToChat('ai', `I've processed your document "${data.filename}":\n\n${data.content}`);

            // Hide welcome section if this is a new conversation
            if (!currentConversationId) {
                welcomeSection.style.display = 'none';
            }

        } catch (error) {
            console.error('Upload error:', error);
            addMessageToChat('ai', 'Sorry, I encountered an error processing your document.');
        } finally {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
            documentUpload.value = '';
            fileName.textContent = '';
        }
    }

    // Add message to chat
// Update the addMessageToChat function in script.js
// Update the addMessageToChat function in script.js
function addMessageToChat(role, content, timestamp = new Date()) {
    if (welcomeSection.style.display !== 'none') {
        welcomeSection.style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message new-message`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Process content for better formatting
    const processedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                   .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                   .replace(/`(.*?)`/g, '<code>$1</code>');
    messageContent.innerHTML = processedContent;

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';

    // Enhanced copy button with better icon and tooltip
    messageActions.innerHTML = `
        <div class="tooltip">
            <button class="action-btn copy-btn" title="Copy to clipboard">
                <i class="far fa-copy"></i>
                <span class="tooltiptext">Copy</span>
            </button>
        </div>
    `;

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    messageDiv.appendChild(messageActions);
    chatHistory.appendChild(messageDiv);

    // Enhanced copy functionality
    const copyBtn = messageDiv.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        const tooltip = copyBtn.querySelector('.tooltiptext');
        tooltip.textContent = 'Copied!';
        tooltip.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
            tooltip.textContent = 'Copy';
            tooltip.style.backgroundColor = 'var(--dark-color)';
        }, 2000);
    });

    // Scroll to bottom with smooth behavior
    chatHistory.scrollTo({
        top: chatHistory.scrollHeight,
        behavior: 'smooth'
    });
}

async function renameConversation(conversationId, newName) {
  try {
    const response = await fetch('/api/conversation/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId,
        newName
      })
    });

    if (!response.ok) throw new Error('Failed to rename conversation');

    // Update the UI
    const item = document.querySelector(`.history-item[data-id="${conversationId}"]`);
    if (item) {
      item.querySelector('span').textContent = newName;
    }
  } catch (error) {
    console.error('Error renaming conversation:', error);
    showError('Failed to rename conversation');
  }
}

    // Show loading indicator
    function showLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message';
        loadingDiv.id = id;

        const loadingContent = document.createElement('div');
        loadingContent.className = 'loading-dots';
        loadingContent.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;

        loadingDiv.appendChild(loadingContent);
        chatHistory.appendChild(loadingDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        return id;
    }

    // Remove loading indicator
    function removeLoadingIndicator(id) {
        const loadingElement = document.getElementById(id);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        chatHistory.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
});
