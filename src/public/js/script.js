// Utility function to escape regex special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const inputField = document.getElementById('input-field');
    const sendButton = document.getElementById('send-button');
    const userCountElement = document.getElementById('user-count');
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');
    const charCount = document.getElementById('char-count');
    const helpBtn = document.getElementById('help-btn');
    const clearBtn = document.getElementById('clear-btn');
    const emojiButton = document.getElementById('emoji-button');
    
    // Dynamic WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(socketUrl);

    let currentUsername = 'Guest';
    let isConnected = false;
    let messageQueue = [];
    let lastMessageTime = 0;
    const MESSAGE_COOLDOWN = 1000;
    let originalTitle = document.title;
    let unreadCount = 0;
    let isTyping = false;
    
    // Sound elements
    const pingSound = new Audio('./assets/sounds/ping.wav');
    pingSound.volume = 0.3;
    
    // Emoji list
    const emojis = ['😀', '😂', '😊', '😍', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '😎', '🤩', '😢', '😭', '😡', '🤗', '🙌', '👏', '💯'];
    
    // Auto-resize textarea
    function autoResizeTextarea() {
        inputField.style.height = 'auto';
        inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
    }
    
    // Insert random emoji
    function insertRandomEmoji() {
        // Use cryptographically secure random index
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        const randomIndex = array[0] % emojis.length;
        const randomEmoji = emojis[randomIndex];
        const start = inputField.selectionStart;
        const end = inputField.selectionEnd;
        const text = inputField.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        inputField.value = before + randomEmoji + after;
        inputField.selectionStart = inputField.selectionEnd = start + randomEmoji.length;
        inputField.focus();
        autoResizeTextarea();
        // Update char count
        const length = inputField.value.length;
        charCount.textContent = length;
    }
    
    // Show app after loading
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            inputField.focus();
        }, 200);
    }, 800);

    // Connection event handlers
    socket.onopen = () => {
        console.log('Connected to Room21 server');
        isConnected = true;
        showSystemMessage('Connected to Room21! You can start chatting now.', 'success');
        loadMessages();
        flushMessageQueue();
        updateConnectionStatus(true);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        showSystemMessage('Connection error. Please try refreshing the page.', 'error');
        updateConnectionStatus(false);
    };

    socket.onclose = () => {
        console.log('Disconnected from server');
        isConnected = false;
        showSystemMessage('Disconnected from server. Attempting to reconnect...', 'warning');
        updateConnectionStatus(false);
        
        setTimeout(() => {
            if (!isConnected) {
                location.reload();
            }
        }, 3000);
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    // Message handling
    function handleIncomingMessage(data) {
        switch (data.type) {
            case 'system':
                if (data.message.includes('You are ')) {
                    currentUsername = data.message.split('You are ')[1];
                    updateUsernameDisplay();
                    // Remove welcome banner after getting username
                    const welcomeBanner = document.querySelector('.welcome-banner');
                    if (welcomeBanner) {
                        welcomeBanner.style.transition = 'opacity 0.5s ease';
                        welcomeBanner.style.opacity = '0';
                        setTimeout(() => welcomeBanner.remove(), 500);
                    }
                }
                // Use the style from the server if provided, otherwise default to 'info'
                showSystemMessage(data.message, data.style || 'info');
                break;
                
            case 'chat_message':
                displayChatMessage(data);
                saveMessage(data);
                break;
                
            case 'user_joined':
            case 'user_left':
            case 'nick_change':
                showSystemMessage(data.message, 'info');
                break;
                
            case 'user_count':
                updateUserCount(data.count);
                break;
                
            case 'clear_chat':
                clearChat();
                break;
                
            case 'error':
                showSystemMessage(data.message, 'error');
                break;
                
            case 'ban_message':
                showBanMessage(data.message, data.reason);
                break;
                
            case 'user_list':
                displayUserList(data.users);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    function displayChatMessage(data) {
        const { username, message, timestamp } = data;
        const time = new Date(timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Check for mentions
        const safeUsername = escapeRegExp(currentUsername);
        const mentionPattern = new RegExp(`@${safeUsername}\\b`, 'i');
        const isMentioned = mentionPattern.test(message);
        
        if (isMentioned) {
            pingSound.play().catch(e => console.log('Could not play sound:', e));
        }
        
        // Update unread count if window is not focused
        if (document.hidden && username !== currentUsername) {
            unreadCount++;
            document.title = `(${unreadCount}) ${originalTitle}`;
        }
        
        const messageElement = document.createElement('div');
        const isOwnMessage = username === currentUsername;
        messageElement.className = `message ${isMentioned ? 'mentioned' : ''} ${isOwnMessage ? 'own' : ''}`;
        
        // Process message for mentions and links
        const processedMessage = processMessageContent(message);
        
        // Don't show reply button for own messages or system messages
        const showReplyButton = !isOwnMessage && username !== 'System';
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="username">${escapeHtml(username)}</span>
                <span class="timestamp">${time}</span>
                ${showReplyButton ? `
                    <div class="message-actions">
                        <button class="reply-button" data-username="${escapeHtml(username)}" title="Reply to ${escapeHtml(username)}">
                            ↩ Reply
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="message-content">${processedMessage}</div>
        `;
        
        chatBox.appendChild(messageElement);
        scrollToBottom();
    }

    function processMessageContent(message) {
        let processed = escapeHtml(message);
        
        // Highlight mentions
        processed = processed.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        processed = processed.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        return processed;
    }

    function showSystemMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        
        // Handle special admin message types
        let cssClass = type;
        if (message.includes('📢 ANNOUNCEMENT:')) {
            cssClass = 'announcement';
        } else if (type === 'admin' || message.includes('[ADMIN]')) {
            cssClass = 'admin';
        }
        
        messageElement.className = `system-message ${cssClass}`;
        messageElement.innerHTML = `${escapeHtml(message)}`;
        chatBox.appendChild(messageElement);
        scrollToBottom();
        
        // Auto-remove after longer time for important messages
        const removeTime = (cssClass === 'announcement' || cssClass === 'admin') ? 20000 : 12000;
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                messageElement.style.opacity = '0';
                messageElement.style.transform = 'translateY(-8px)';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.remove();
                    }
                }, 500);
            }
        }, removeTime);
    }

    function showBanMessage(message, reason) {
        // Create a special modal-style ban message
        const banModal = document.createElement('div');
        banModal.className = 'ban-modal';
        banModal.innerHTML = `
            <div class="ban-modal-content">
                <div class="ban-modal-header">
                    <span class="ban-icon">🚫</span>
                    <h2>ACCESS DENIED</h2>
                </div>
                <div class="ban-modal-body">
                    <p class="ban-message">${escapeHtml(message)}</p>
                    <div class="ban-reason">
                        <strong>Reason:</strong>
                        <p>${escapeHtml(reason)}</p>
                    </div>
                    <div class="ban-footer">
                        <p>If you believe this ban was issued in error, please contact the server administrator.</p>
                        <p class="ban-timestamp">Ban issued: ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body (not chat box)
        document.body.appendChild(banModal);
        
        // Show with animation
        setTimeout(() => {
            banModal.classList.add('show');
        }, 100);
        
        // Also add a system message to chat
        showSystemMessage(`${message} - Reason: ${reason}`, 'error');
        
        // Auto-close after 10 seconds (before connection closes)
        setTimeout(() => {
            if (banModal.parentNode) {
                banModal.classList.remove('show');
                setTimeout(() => {
                    if (banModal.parentNode) {
                        banModal.remove();
                    }
                }, 500);
            }
        }, 8000);
    }

    function updateUserCount(count) {
        if (userCountElement) {
            userCountElement.textContent = count;
        }
        
        document.title = `Room21 (${count} online)`;
    }

    function updateUsernameDisplay() {
        const usernameDisplay = document.getElementById('current-username');
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUsername;
        }
    }

    function updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
        }
        
        sendButton.disabled = !connected;
        inputField.disabled = !connected;
        
        if (!connected) {
            inputField.placeholder = 'Connecting...';
        } else {
            inputField.placeholder = 'Chat Anything...';
        }
    }

    function clearChat() {
        chatBox.innerHTML = `
            <div class="welcome-banner">
                <h3>Chat Cleared</h3>
                <p>Start a new conversation. Your message history has been cleared.</p>
            </div>
        `;
        localStorage.removeItem('room21_messages');
    }

    function replyToUser(username) {
        // Add @username to the input field
        const mention = `@${username} `;
        inputField.value = mention + inputField.value;
        
        // Focus the input field and position cursor after the mention
        inputField.focus();
        inputField.setSelectionRange(mention.length, mention.length);
        
        // Auto-resize the textarea if needed
        autoResizeTextarea();
        
        // Show a subtle feedback
        showSystemMessage(`Replying to ${username}`, 'info');
    }

    function sendMessage() {
        const message = inputField.value.trim();
        const currentTime = Date.now();

        if (!message) return;

        // Rate limiting
        if (currentTime - lastMessageTime < MESSAGE_COOLDOWN) {
            showSystemMessage('Please wait before sending another message.', 'warning');
            return;
        }

        if (message.length > 500) {
            showSystemMessage('Message too long. Maximum 500 characters allowed.', 'error');
            return;
        }

        lastMessageTime = currentTime;

        // Handle commands
        if (message.startsWith('/')) {
            handleCommand(message);
        } else {
            // Send regular message
            if (isConnected) {
                socket.send(JSON.stringify({
                    message: message
                }));
                inputField.value = '';
                autoResizeTextarea();
            } else {
                messageQueue.push(message);
                showSystemMessage('Message queued. Will send when connected.', 'info');
            }
        }
    }

    function handleCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        
        switch (cmd) {
            case '/clear':
                socket.send(JSON.stringify({ command: '/clear' }));
                break;
                
            case '/users':
                socket.send(JSON.stringify({ command: '/users' }));
                break;
                
            case '/nick':
                if (parts.length > 1) {
                    const newNick = parts.slice(1).join(' ');
                    socket.send(JSON.stringify({ command: `/nick ${newNick}` }));
                } else {
                    showSystemMessage('Usage: /nick <new_nickname>', 'error');
                }
                break;
                
            case '/help':
                showHelpMessage();
                break;
                
            default:
                showSystemMessage(`Unknown command: ${cmd}. Type /help for available commands.`, 'error');
        }
        
        inputField.value = '';
        autoResizeTextarea();
    }

    function showHelpMessage() {
        const helpElement = document.createElement('div');
        helpElement.className = 'system-message info';
        helpElement.innerHTML = `
            <strong>Available Commands:</strong><br>
            <p styles="margin:0;"></p>
            <code>/nick &lt;name&gt;</code> - Change your nickname<br>
            <p styles="margin:0;"></p>
            <code>/users</code> - Show online users<br>
            <p styles="margin:0;"></p>
            <code>/clear</code> - Clear chat history<br>
            <p styles="margin:0;"></p>
            <code>/help</code> - Show this help<br><br>
            <p styles="margin:0;"></p>
            <strong>Tips:</strong> Use @username to mention someone
        `;
        chatBox.appendChild(helpElement);
        scrollToBottom();
    }

    function displayUserList(users) {
        const usersElement = document.createElement('div');
        usersElement.className = 'system-message info';
        
        const title = document.createElement('strong');
        title.textContent = `Online Users (${users.length}):`;
        usersElement.appendChild(title);
        usersElement.appendChild(document.createElement('br'));
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            const username = document.createElement('span');
            username.textContent = user.username;
            const connectedAt = document.createElement('span');
            connectedAt.textContent = ` (online since ${new Date(user.connectedAt).toLocaleTimeString()})`;
            
            userElement.appendChild(username);
            userElement.appendChild(connectedAt);
            usersElement.appendChild(userElement);
        });
        
        chatBox.appendChild(usersElement);
        scrollToBottom();
    }

    function flushMessageQueue() {
        while (messageQueue.length > 0 && isConnected) {
            const message = messageQueue.shift();
            socket.send(JSON.stringify({ message }));
        }
    }

    function saveMessage(data) {
        try {
            const messages = JSON.parse(localStorage.getItem('room21_messages')) || [];
            messages.push({
                ...data,
                saved: true
            });
            
            if (messages.length > 100) {
                messages.splice(0, messages.length - 100);
            }
            
            localStorage.setItem('room21_messages', JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    function loadMessages() {
        try {
            const messages = JSON.parse(localStorage.getItem('room21_messages')) || [];
            messages.forEach(data => {
                if (data.saved) {
                    displayChatMessage(data);
                }
            });
        } catch (error) {
            console.error('Error loading messages:', error);
            localStorage.removeItem('room21_messages');
        }
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    emojiButton.addEventListener('click', insertRandomEmoji);

    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    inputField.addEventListener('input', () => {
        const length = inputField.value.length;
        charCount.textContent = length;
        
        if (length > 450) {
            charCount.style.color = 'var(--text-danger)';
        } else if (length > 400) {
            charCount.style.color = 'var(--text-warning)';
        } else {
            charCount.style.color = 'var(--text-muted)';
        }
        
        autoResizeTextarea();
    });

    // Footer button handlers
    if (helpBtn) {
        helpBtn.addEventListener('click', showHelpMessage);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat?')) {
                socket.send(JSON.stringify({ command: '/clear' }));
            }
        });
    }

    // Reply button handler using event delegation
    chatBox.addEventListener('click', (e) => {
        if (e.target.classList.contains('reply-button')) {
            const username = e.target.dataset.username;
            if (username) {
                replyToUser(username);
            }
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            unreadCount = 0;
            document.title = originalTitle;
            
            if (!isConnected) {
                location.reload();
            }
        }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
        if (isConnected) {
            socket.close();
        }
    });

    // Initialize
    updateConnectionStatus(false);
    console.log('Room21 client initialized');
});
