document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatHistory = document.getElementById('chatHistory');
    const welcomeSection = document.getElementById('welcomeSection');
    const welcomeInput = document.getElementById('welcomeInput');
    const quickPrompts = document.querySelectorAll('.quick-prompt');
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    const historyPanel = document.getElementById('historyPanel');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyList = document.getElementById('historyList');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const modelSelect = document.getElementById('model');
    const documentUpload = document.getElementById('documentUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileName = document.getElementById('fileName');
    const filePreview = document.getElementById('filePreview');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const documentModal = document.getElementById('documentModal');
    const closeDocumentModal = document.getElementById('closeDocumentModal');
    const useDocumentBtn = document.getElementById('useDocumentBtn');
    const documentModalContent = document.getElementById('documentModalContent');
    const documentModalTitle = document.getElementById('documentModalTitle');
    const modelInfo = document.getElementById('modelInfo');
    const tokenCounter = document.getElementById('tokenCounter');

    // State variables
    let currentConversationId = null;
    let currentDocumentId = null;
    let currentDocumentName = '';
    let isProcessing = false;
    let socket = io();

    // Initialize the app
    init();

    function init() {
        loadSettings();
        setupEventListeners();
        checkForWelcomeScreen();
        updateModelInfo();
    }

    function setupEventListeners() {
        // Message input
        messageInput.addEventListener('keydown', handleMessageInputKeydown);
        sendBtn.addEventListener('click', sendMessage);
        welcomeInput.addEventListener('keydown', handleWelcomeInputKeydown);

        // Quick prompts - fixed event listener attachment
        quickPrompts.forEach(prompt => {
            prompt.addEventListener('click', (e) => {
                e.stopPropagation();
                const promptText = prompt.getAttribute('data-prompt');
                if (welcomeSection.style.display !== 'none') {
                    welcomeInput.value = promptText;
                    welcomeInput.focus();
                } else {
                    messageInput.value = promptText;
                    messageInput.focus();
                }
            });
        });

        // History panel
        showHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHistoryPanel();
        });
        closeHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHistoryPanel();
        });

        // New chat button - fixed event listener
        newChatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startNewChat();
        });

        // Clear and export chat
        clearChatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearCurrentChat();
        });
        exportChatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportCurrentChat();
        });

        // Model selection
        modelSelect.addEventListener('change', updateModelInfo);

        // File upload - fixed event propagation
        uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            documentUpload.click();
        });
        documentUpload.addEventListener('change', handleFileUpload);

        // Settings
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsPanel();
        });
        closeSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsPanel();
        });
        saveSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveSettings();
        });

        // Document modal
        closeDocumentModal.addEventListener('click', (e) => {
            e.stopPropagation();
            documentModal.style.display = 'none';
        });
        useDocumentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            useCurrentDocument();
        });

        // Socket.io events
        socket.on('connect', () => {
            console.log('Connected to server via WebSocket');
        });

        socket.on('ai_response', (data) => {
            if (data.conversationId === currentConversationId) {
                updateAIResponse(data);
            }
        });

        socket.on('ai_thought', (data) => {
            if (data.conversationId === currentConversationId) {
                showThoughtProcess(data.thought);
            }
        });

        // Click outside to close panels - fixed event delegation
        document.addEventListener('click', (e) => {
            if (!historyPanel.contains(e.target) && e.target !== showHistoryBtn && !showHistoryBtn.contains(e.target)) {
                historyPanel.classList.remove('open');
            }
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('open');
            }
        });

        // Theme change based on system preference
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', (e) => {
            if (localStorage.getItem('theme') === 'system') {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Input event for token counter
        messageInput.addEventListener('input', updateTokenCounter);
        welcomeInput.addEventListener('input', updateTokenCounter);
    }

    function handleMessageInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function handleWelcomeInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            startNewChat(welcomeInput.value);
        }
    }

    function toggleHistoryPanel() {
        historyPanel.classList.toggle('open');
        if (historyPanel.classList.contains('open')) {
            updateHistoryPanel();
        }
    }

    function toggleSettingsPanel() {
        settingsPanel.classList.toggle('open');
    }

    function updateModelInfo() {
        const selectedModel = modelSelect.options[modelSelect.selectedIndex].text;
        modelInfo.textContent = `Current model: ${selectedModel}`;
    }

    function checkForWelcomeScreen() {
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation');

        if (conversationId) {
            loadConversation(conversationId);
        } else if (!currentConversationId) {
            welcomeSection.style.display = 'flex';
            chatHistory.style.display = 'none';
        }
    }

    function startNewChat(initialMessage = '') {
        currentConversationId = null;
        currentDocumentId = null;
        currentDocumentName = '';

        chatHistory.innerHTML = '';
        welcomeSection.classList.add('hide');

        setTimeout(() => {
            welcomeSection.style.display = 'none';
            chatHistory.style.display = 'flex';
            welcomeSection.classList.remove('hide');
        }, 500);

        if (initialMessage) {
            messageInput.value = initialMessage;
            setTimeout(() => {
                sendMessage();
            }, 100);
        }

        // Reset input placeholder
        messageInput.placeholder = 'Type your message here...';
    }

    function loadConversation(conversationId) {
        fetch(`/api/conversation/${conversationId}`)
            .then(response => response.json())
            .then(data => {
                currentConversationId = conversationId;
                chatHistory.innerHTML = '';

                data.messages.forEach(message => {
                    appendMessage(message.role, message.content, message.timestamp, message.documentId);
                });

                welcomeSection.style.display = 'none';
                chatHistory.style.display = 'flex';

                // Scroll to bottom
                setTimeout(() => {
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }, 100);
            })
            .catch(error => {
                console.error('Error loading conversation:', error);
                startNewChat();
            });
    }

    function sendMessage() {
        const message = welcomeSection.style.display !== 'none' ? welcomeInput.value.trim() : messageInput.value.trim();
        if (!message || isProcessing) return;

        // If we're in welcome screen, start a new chat
        if (welcomeSection.style.display !== 'none') {
            startNewChat(message);
            return;
        }

        isProcessing = true;
        messageInput.disabled = true;
        sendBtn.disabled = true;

        // Add user message to chat
        appendMessage('user', message, new Date().toISOString(), currentDocumentId);
        if (welcomeSection.style.display !== 'none') {
            welcomeInput.value = '';
        } else {
            messageInput.value = '';
        }

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <span>AI is typing...</span>
        `;
        chatHistory.appendChild(typingIndicator);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Prepare data for API
        const data = {
            message: message,
            model: modelSelect.value,
            conversationId: currentConversationId,
            documentId: currentDocumentId
        };

        // Send message to server
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            const indicators = document.querySelectorAll('.typing-indicator');
            indicators.forEach(indicator => indicator.remove());

            if (!currentConversationId) {
                currentConversationId = data.conversationId;
                updateHistoryPanel();
            }

            // Add AI response to chat
            appendMessage('assistant', data.response, new Date().toISOString());
        })
        .catch(error => {
            console.error('Error:', error);
            appendMessage('assistant', 'Sorry, there was an error processing your request.', new Date().toISOString());
        })
        .finally(() => {
            isProcessing = false;
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
            updateTokenCounter();
        });
    }

    function appendMessage(role, content, timestamp, documentId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message new-message`;

        // Format timestamp
        const time = new Date(timestamp);
        const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Process content with Markdown if it's from the assistant
        let processedContent = content;
        if (role === 'assistant') {
            // Separate thought process from response
            const thoughtMatch = content.match(/<think>(.*?)<\/think>/s);
            let mainContent = content;
            let thoughtContent = '';

            if (thoughtMatch) {
                thoughtContent = thoughtMatch[1];
                mainContent = content.replace(thoughtMatch[0], '');
            }

            processedContent = marked.parse(mainContent);

            if (thoughtContent) {
                processedContent += `
                    <div class="thought-container">
                        <small>Thought Process:</small>
                        <div class="thought-process">${marked.parse(thoughtContent)}</div>
                    </div>
                `;
            }
        } else {
            // For user messages, escape HTML and preserve line breaks
            processedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }

        messageDiv.innerHTML = `
            <div class="message-content">${processedContent}</div>
            <div class="message-time">${formattedTime}</div>
            <div class="message-actions">
                <button class="action-btn tooltip copy-btn" title="Copy message">
                    <i class="fas fa-copy"></i>
                    <span class="tooltiptext">Copy</span>
                </button>
            </div>
        `;

        chatHistory.appendChild(messageDiv);

        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Highlight code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Add copy functionality
        messageDiv.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                const tooltip = messageDiv.querySelector('.tooltiptext');
                tooltip.textContent = 'Copied!';
                setTimeout(() => {
                    tooltip.textContent = 'Copy';
                }, 2000);
            });
        });

        // Add document reference if exists
        if (documentId) {
            fetch(`/api/document/${documentId}`)
                .then(response => response.json())
                .then(data => {
                    const docPreview = document.createElement('div');
                    docPreview.className = 'document-preview';
                    docPreview.innerHTML = `
                        <h4><i class="fas fa-file-alt"></i> Document Reference</h4>
                        <p>${data.content.substring(0, 200)}${data.content.length > 200 ? '...' : ''}</p>
                    `;
                    messageDiv.appendChild(docPreview);
                });
        }

        // Remove new-message class after animation
        setTimeout(() => {
            messageDiv.classList.remove('new-message');
        }, 300);
    }

    function updateAIResponse(data) {
        let lastMessage = chatHistory.lastElementChild;
        let isNewMessage = false;

        // Check if we need to create a new message or update existing one
        if (!lastMessage || !lastMessage.classList.contains('assistant-message') ||
            data.isNewMessage) {
            appendMessage('assistant', data.response, new Date().toISOString());
            lastMessage = chatHistory.lastElementChild;
            isNewMessage = true;
        }

        // Get the content div
        const contentDiv = lastMessage.querySelector('.message-content');

        // For new messages, we'll do a typing effect
        if (isNewMessage && data.response) {
            // Clear any existing content
            contentDiv.innerHTML = '';

            // Create a container for the typing effect
            const typingContainer = document.createElement('div');
            typingContainer.className = 'typing-content';
            contentDiv.appendChild(typingContainer);

            // Type out the response character by character
            let i = 0;
            const typingSpeed = 20; // milliseconds per character

            function typeWriter() {
                if (i < data.response.length) {
                    // Separate thought process if it exists
                    if (data.response.substring(i).startsWith('<think>')) {
                        const thoughtEnd = data.response.indexOf('</think>', i);
                        if (thoughtEnd !== -1) {
                            // Skip typing the thought process (we'll handle it separately)
                            i = thoughtEnd + 8; // length of </think>
                            typeWriter();
                            return;
                        }
                    }

                    typingContainer.innerHTML = marked.parse(data.response.substring(0, i + 1));
                    i++;
                    setTimeout(typeWriter, typingSpeed);

                    // Scroll to bottom as we type
                    chatHistory.scrollTop = chatHistory.scrollHeight;

                    // Highlight any code blocks
                    document.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }
            }

            typeWriter();
        } else {
            // For updates to existing messages, just replace the content
            contentDiv.innerHTML = marked.parse(data.response);

            // Highlight code blocks
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showThoughtProcess(thought) {
        const lastMessage = chatHistory.lastElementChild;

        if (lastMessage && lastMessage.classList.contains('assistant-message')) {
            let thoughtDiv = lastMessage.querySelector('.thought-process');

            if (!thoughtDiv) {
                const thoughtContainer = document.createElement('div');
                thoughtContainer.className = 'thought-container';
                thoughtContainer.innerHTML = `
                    <small>Thought Process:</small>
                    <div class="thought-process"></div>
                `;
                lastMessage.appendChild(thoughtContainer);
                thoughtDiv = thoughtContainer.querySelector('.thought-process');
            }

            thoughtDiv.innerHTML = marked.parse(thought);
        }
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        fileName.textContent = file.name;
        currentDocumentName = file.name;

        const formData = new FormData();
        formData.append('document', file);

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            currentDocumentId = data.documentId;

            // Show file preview with collapse/remove options
            filePreview.innerHTML = `
                <h4><i class="fas fa-file-alt"></i> ${data.filename}</h4>
                <p>${data.content}</p>
                <button class="file-preview-toggle" id="togglePreview">Collapse</button>
                <button class="file-preview-remove" id="removeDocument">Remove</button>
                <button class="btn-primary" id="viewFullDocument">View Full Document</button>
            `;
            filePreview.classList.add('active');

            // Add event listeners
            document.getElementById('togglePreview').addEventListener('click', () => {
                filePreview.classList.toggle('collapsed');
                const btn = document.getElementById('togglePreview');
                btn.textContent = filePreview.classList.contains('collapsed') ? 'Expand' : 'Collapse';
            });

            document.getElementById('removeDocument').addEventListener('click', () => {
                currentDocumentId = null;
                currentDocumentName = '';
                fileName.textContent = '';
                filePreview.classList.remove('active');
                documentUpload.value = '';
                messageInput.placeholder = 'Type your message here...';
            });

            document.getElementById('viewFullDocument').addEventListener('click', () => {
                showDocumentPreview(data.documentId, data.filename, data.content);
            });
        })
        .catch(error => {
            console.error('Upload error:', error);
            fileName.textContent = 'Upload failed';
        });
    }

    function showDocumentPreview(documentId, filename, content) {
        documentModalTitle.textContent = `Preview: ${filename}`;
        documentModalContent.textContent = content;
        documentModal.style.display = 'block';
        currentDocumentId = documentId;
    }

    function useCurrentDocument() {
        documentModal.style.display = 'none';
        messageInput.placeholder = `Ask about ${currentDocumentName}...`;
        messageInput.focus();
    }

    function clearCurrentChat() {
        if (confirm('Are you sure you want to clear this conversation?')) {
            chatHistory.innerHTML = '';
            currentConversationId = null;
            currentDocumentId = null;
            currentDocumentName = '';
            messageInput.placeholder = 'Type your message here...';
            filePreview.classList.remove('active');
            fileName.textContent = '';
            documentUpload.value = '';

            // Show welcome section again
            welcomeSection.style.display = 'flex';
            chatHistory.style.display = 'none';
        }
    }

    function exportCurrentChat() {
        if (!currentConversationId) {
            alert('No conversation to export');
            return;
        }

        fetch(`/api/conversation/${currentConversationId}`)
            .then(response => response.json())
            .then(data => {
                let exportText = `Conversation: ${data.name}\n\n`;

                data.messages.forEach(msg => {
                    const role = msg.role === 'user' ? 'You' : 'AI';
                    exportText += `${role}: ${msg.content}\n\n`;
                });

                const blob = new Blob([exportText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
    }

    function updateHistoryPanel() {
        fetch('/chatbot')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newHistoryList = doc.getElementById('historyList');
                historyList.innerHTML = newHistoryList.innerHTML;

                // Add event listeners to new history items
                document.querySelectorAll('.history-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const conversationId = item.getAttribute('data-id');
                        loadConversation(conversationId);
                        historyPanel.classList.remove('open');
                    });
                });

                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-history-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const conversationId = btn.getAttribute('data-id');
                        deleteConversation(conversationId);
                    });
                });
            });
    }

    function deleteConversation(conversationId) {
        if (confirm('Are you sure you want to delete this conversation?')) {
            fetch(`/api/conversation/${conversationId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateHistoryPanel();
                    if (currentConversationId === conversationId) {
                        clearCurrentChat();
                    }
                }
            });
        }
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('chatSettings')) || {};

        // Apply model setting
        if (settings.model) {
            const option = Array.from(modelSelect.options).find(opt => opt.value === settings.model);
            if (option) {
                option.selected = true;
                updateModelInfo();
            }
        }

        // Apply theme setting
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : settings.theme);
            themeSelect.value = settings.theme;
        }

        // Apply code theme setting
        if (settings.codeTheme) {
            codeThemeSelect.value = settings.codeTheme;
        }

        // Apply temperature setting
        if (settings.temperature !== undefined) {
            document.getElementById('temperature').value = settings.temperature;
            document.getElementById('temperatureValue').textContent = settings.temperature;
        }

        // Apply max tokens setting
        if (settings.maxTokens !== undefined) {
            document.getElementById('maxTokens').value = settings.maxTokens;
            document.getElementById('maxTokensValue').textContent = `${settings.maxTokens} tokens`;
        }
    }

    function saveSettings() {
        const settings = {
            model: modelSelect.value,
            theme: themeSelect.value,
            codeTheme: codeThemeSelect.value,
            temperature: parseFloat(document.getElementById('temperature').value),
            maxTokens: parseInt(document.getElementById('maxTokens').value)
        };

        localStorage.setItem('chatSettings', JSON.stringify(settings));

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', settings.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : settings.theme);

        // Apply code theme
        applyCodeTheme();

        toggleSettingsPanel();
    }

    function applyCodeTheme() {
        const codeTheme = codeThemeSelect.value;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/${codeTheme}.min.css`;

        // Remove any existing highlight.js theme
        const existingTheme = document.querySelector('link[href*="highlight.js"]');
        if (existingTheme) {
            document.head.removeChild(existingTheme);
        }

        document.head.appendChild(link);
    }


    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    function updateTokenCounter() {
        const text = welcomeSection.style.display !== 'none' ? welcomeInput.value : messageInput.value;
        // Simple token estimation (1 token ~= 4 characters)
        const tokenCount = Math.ceil(text.length / 4);
        tokenCounter.textContent = `${tokenCount} tokens`;
    }

    // Initialize range inputs
    document.getElementById('temperature').addEventListener('input', (e) => {
        document.getElementById('temperatureValue').textContent = e.target.value;
    });

    document.getElementById('maxTokens').addEventListener('input', (e) => {
        document.getElementById('maxTokensValue').textContent = `${e.target.value} tokens`;
    });
});


