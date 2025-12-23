class AIChat {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.themeToggle = document.getElementById('themeToggle');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebar = document.querySelector('.sidebar');
        this.typingStatus = document.getElementById('typingStatus');
        this.isDarkMode = false;
        this.currentChatId = null;
        this.chats = [];
        this.checkAuth();
        this.init();
    }

    checkAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }
        this.verifySession();
    }

    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('authToken');
    }

    async verifySession() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.logout();
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.username) {
            this.loadUserProfile(userData);
            this.loadChats();
        }

        try {
            const response = await fetch(`auth.php?action=verify&token=${token}`);
            const data = await response.json();
            if (!data.valid) {
                this.logout();
            }
        } catch (error) {
            console.warn('Session verification failed');
        }
    }

    loadUserProfile(user = null) {
        if (!user) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            user = userData;
        }
        
        const profileName = document.querySelector('.profile-name');
        if (profileName && user.username) {
            profileName.textContent = user.username;
        }
    }

    loadChats() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const savedChats = JSON.parse(localStorage.getItem(`chats_${userData.id}`) || '[]');
        this.chats = savedChats;
        
        if (this.chats.length === 0) {
            this.createNewChat();
        } else {
            this.currentChatId = this.chats[0].id;
            this.renderChatHistory();
            this.loadChat(this.chats[0].id);
        }
    }

    renderChatHistory() {
        const chatHistory = document.querySelector('.chat-history');
        chatHistory.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.innerHTML = `
                <div class="history-content">
                    <span class="history-title">${chat.title}</span>
                    <span class="history-preview">${chat.preview}</span>
                </div>
                <button class="delete-chat" data-chat-id="${chat.id}" title="Delete chat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat')) {
                    this.loadChat(chat.id);
                    // Close sidebar on mobile after selecting chat
                    if (window.innerWidth <= 768) {
                        this.sidebar.classList.remove('open');
                        this.removeMobileOverlay();
                    }
                }
            });
            
            const deleteBtn = chatItem.querySelector('.delete-chat');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            });
            
            chatHistory.appendChild(chatItem);
        });
    }

    createNewChat() {
        const newChat = {
            id: Date.now().toString(),
            title: 'New Chat',
            preview: 'Start a conversation...',
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        this.chats.unshift(newChat);
        this.currentChatId = newChat.id;
        this.saveChats();
        this.renderChatHistory();
        this.clearMessages();
        this.showWelcomeMessage();
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        this.currentChatId = chatId;
        this.renderChatHistory();
        this.clearMessages();
        
        if (chat.messages.length === 0) {
            this.showWelcomeMessage();
        } else {
            const fragment = document.createDocumentFragment();
            chat.messages.forEach(msg => {
                const messageElement = this.createMessageElement(msg.content, msg.sender);
                fragment.appendChild(messageElement);
            });
            this.messagesContainer.appendChild(fragment);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    createMessageElement(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${sender}-avatar`;
        avatar.innerHTML = sender === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${this.formatMessage(content)}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        return messageDiv;
    }

    deleteChat(chatId) {
        this.chats = this.chats.filter(c => c.id !== chatId);
        this.saveChats();
        
        if (this.currentChatId === chatId) {
            if (this.chats.length > 0) {
                this.loadChat(this.chats[0].id);
            } else {
                this.createNewChat();
            }
        } else {
            this.renderChatHistory();
        }
    }

    saveChats() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem(`chats_${userData.id}`, JSON.stringify(this.chats));
    }

    updateChatTitle(chatId, firstMessage) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat && chat.title === 'New Chat') {
            chat.title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
            chat.preview = firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage;
            this.saveChats();
            this.renderChatHistory();
        }
    }

    saveMessageToChat(content, sender) {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat) {
            chat.messages.push({
                content,
                sender,
                timestamp: new Date().toISOString()
            });
            this.saveChats();
        }
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }

    showWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <div class="welcome-icon">✨</div>
            <h2>Welcome to AI Assistant</h2>
            <p>I'm here to help you with anything you need. Ask me questions, get creative ideas, or just have a conversation!</p>
            <div class="quick-actions">
                <button class="quick-btn" data-message="Tell me a joke">😄 Tell me a joke</button>
                <button class="quick-btn" data-message="What can you help me with?">🤔 What can you do?</button>
                <button class="quick-btn" data-message="Give me a creative writing prompt">✍️ Writing prompt</button>
            </div>
        `;
        
        welcomeDiv.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.dataset.message;
                this.messageInput.value = message;
                this.sendMessage();
            });
        });
        
        this.messagesContainer.appendChild(welcomeDiv);
    }

    init() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => {
            this.autoResize();
            this.updateTypingStatus();
        });
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', () => {
                this.sidebar.classList.remove('open');
                this.removeMobileOverlay();
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.sidebar.classList.contains('open') && 
                !this.sidebar.contains(e.target) && 
                !this.sidebarToggle.contains(e.target)) {
                this.sidebar.classList.remove('open');
                this.removeMobileOverlay();
            }
        });
        
        document.querySelector('.action-btn').addEventListener('click', () => this.clearChat());
        document.querySelector('.new-chat-btn').addEventListener('click', () => this.createNewChat());
        document.querySelector('.logout-btn').addEventListener('click', () => this.logout());
        
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.toggleTheme();
        }
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
        
        // Add overlay for mobile when sidebar is open
        if (window.innerWidth <= 768) {
            if (this.sidebar.classList.contains('open')) {
                this.addMobileOverlay();
            } else {
                this.removeMobileOverlay();
            }
        }
    }
    
    addMobileOverlay() {
        if (!document.querySelector('.sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(overlay);
            
            // Trigger opacity animation
            setTimeout(() => overlay.style.opacity = '1', 10);
            
            overlay.addEventListener('click', () => {
                this.sidebar.classList.remove('open');
                this.removeMobileOverlay();
            });
        }
    }
    
    removeMobileOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    clearChat() {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat) {
            chat.messages = [];
            this.saveChats();
            this.clearMessages();
            this.showWelcomeMessage();
        }
    }

    updateTypingStatus() {
        if (this.messageInput.value.trim()) {
            this.typingStatus.textContent = 'Typing...';
        } else {
            this.typingStatus.textContent = '';
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        const body = document.body;
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        
        if (this.isDarkMode) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
    }

    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResize();
        this.typingStatus.textContent = '';
        this.sendButton.disabled = true;

        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (chat && chat.messages.length === 1) {
            this.updateChatTitle(this.currentChatId, message);
        }

        this.showTypingIndicator();

        try {
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Oops! Something went wrong on my end. Let me try that again! 🔄', 'bot');
        }

        this.sendButton.disabled = false;
    }

    addMessage(content, sender, saveToChat = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${sender}-avatar`;
        
        if (sender === 'user') {
            avatar.innerHTML = '👤';
        } else {
            avatar.innerHTML = '🤖';
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${this.formatMessage(content)}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        if (saveToChat) {
            this.saveMessageToChat(content, sender);
        }
    }

    formatMessage(message) {
        return message
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar bot-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingMessage = this.messagesContainer.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    async getAIResponse(message) {
        try {
            console.log('Sending request to OpenRouter...');
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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',
                    'HTTP-Referer': window.location.origin
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.3-8b-instruct:free',
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                })
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', data);
                return data.choices[0].message.content;
            } else {
                const errorData = await response.text();
                console.error('API Error:', response.status, errorData);
                throw new Error(`API request failed: ${response.status}`);
            }
        } catch (error) {
            console.error('OpenRouter API Error:', error);
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const responses = {
            greeting: [
                "Hey there! 👋 I'm absolutely thrilled to meet you! How's your day treating you?",
                "Hello! ✨ Welcome to our conversation! I'm excited to chat with you today!",
                "Hi! 🌟 Great to see you here! Ready for an amazing conversation?"
            ],
            question: [
                "That's such a fascinating question! 🤔 Let me share my thoughts on this...",
                "Wow, interesting question! 💭 Here's what I think about that topic...",
                "Great question! 🧠 Based on what I know, here's my perspective..."
            ],
            help: [
                "I'm absolutely here to help! 🤝 What can I assist you with today?",
                "Of course! 💪 I'd love to help you out. What do you need assistance with?",
                "You can count on me! 🎯 What specific help are you looking for?"
            ],
            compliment: [
                "Aww, thank you so much! 😊 That really brightens my day!",
                "You're incredibly kind! 🙏 I truly appreciate that!",
                "Thank you! ✨ You just made my circuits happy! 😄"
            ],
            creative: [
                "Oh, I love creative challenges! 🎨 Let me think of something amazing for you...",
                "Creative mode activated! ✍️ Here's what my imagination came up with...",
                "Time to get creative! 🚀 I've got some exciting ideas for you..."
            ],
            joke: [
                "Here's a good one for you! 😄 Why don't scientists trust atoms? Because they make up everything!",
                "Ready for this? 😂 I told my computer a joke about UDP... but I'm not sure if it got it!",
                "Here's one! 🤣 Why do programmers prefer dark mode? Because light attracts bugs!"
            ],
            default: [
                "That's really intriguing! 💬 I'd love to hear more about your thoughts on this!",
                "Fascinating perspective! 🌟 What aspect interests you the most about this topic?",
                "I find that really interesting! 🔍 Tell me more about what you're thinking!"
            ]
        };

        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return this.getRandomResponse(responses.greeting);
        }
        if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) {
            return this.getRandomResponse(responses.joke);
        }
        if (lowerMessage.includes('creative') || lowerMessage.includes('write') || lowerMessage.includes('story')) {
            return this.getRandomResponse(responses.creative);
        }
        if (lowerMessage.includes('?')) {
            return this.getRandomResponse(responses.question);
        }
        if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
            return this.getRandomResponse(responses.help);
        }
        if (lowerMessage.includes('good') || lowerMessage.includes('great') || lowerMessage.includes('awesome') || lowerMessage.includes('amazing')) {
            return this.getRandomResponse(responses.compliment);
        }
        
        return this.getRandomResponse(responses.default);
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async logout() {
        const token = localStorage.getItem('authToken');
        
        if (token) {
            try {
                await fetch('auth.php?action=logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token })
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AIChat();
});
