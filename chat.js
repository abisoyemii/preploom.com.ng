// PrepLoom AI Chatbot - Live Chat Widget
// Add to any HTML: <link rel="stylesheet" href="chat.css"> <script src="chat.js"></script>
// Matches project theme: --primary #1e40af, --secondary #3b82f6

(function() {
  'use strict';

  // Chat configuration
  const CHAT_CONFIG = {
    botName: 'PrepBot',
    userName: 'You',
    welcomeMessage: 'Hi! 👋 I\'m PrepBot, your 24/7 exam prep assistant. Ask me about TOEFL, PMP, exam dates, login help, or anything else!',
    placeholder: 'Type your question... (e.g., "TOEFL dates?" or "how to login")',
    quickReplies: [
      { text: 'TOEFL iBT info', payload: 'toefl' },
      { text: 'PMP exam', payload: 'pmp' },
      { text: 'Login help', payload: 'login' },
      { text: 'Exam dates', payload: 'dates' },
      { text: 'Enroll now', payload: 'enroll' }
    ]
  };

  // State
  let chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  let isTyping = false;

  // DOM elements (lazy init)
  let chatToggle, chatContainer, chatMessages, chatInput, chatSend, chatMinimize, chatClose;

  // Init chat
  function initChat() {
    if (document.getElementById('preploom-chat')) return; // Already init

    createChatHTML();
    bindEvents();
    renderChat();
    loadHistory();
  }

  // Create HTML structure
  function createChatHTML() {
    const chatHTML = `
      <div id="preploom-chat" class="preploom-chat-container">
        <div class="preploom-chat-toggle">
          <div class="preploom-chat-avatar">💬</div>
          <div class="preploom-chat-badge">Live Chat</div>
          <div class="preploom-chat-status">Online</div>
        </div>
        <div class="preploom-chat-window">
          <div class="preploom-chat-header">
            <div class="preploom-chat-avatar-small">🤖</div>
            <span>${CHAT_CONFIG.botName}</span>
            <div class="preploom-chat-actions">
              <button id="chatMinimize" title="Minimize">−</button>
              <button id="chatClose" title="Close">✕</button>
            </div>
          </div>
          <div id="chatMessages" class="preploom-chat-messages"></div>
          <div class="preploom-chat-input-container">
            <div class="preploom-quick-replies">
              ${CHAT_CONFIG.quickReplies.map(q => `<button class="quick-reply" data-payload="${q.payload}">${q.text}</button>`).join('')}
            </div>
            <input type="text" id="chatInput" placeholder="${CHAT_CONFIG.placeholder}" maxlength="500">
            <button id="chatSend">Send</button>
          </div>
        </div>
      </div>
      <style>
        /* Chat CSS - Matches project theme */
        .preploom-chat-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          font-family: 'Segoe UI', sans-serif;
        }
        .preploom-chat-toggle {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(30,64,175,0.4);
          transition: all 0.3s;
          position: relative;
        }
        .preploom-chat-toggle:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(30,64,175,0.6);
        }
        .preploom-chat-avatar {
          font-size: 24px;
          margin-bottom: 2px;
        }
        .preploom-chat-badge {
          font-size: 10px;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .preploom-chat-status {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          margin-top: 2px;
        }
        .preploom-chat-window {
          width: 360px;
          height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .preploom-chat-window.active {
          display: flex;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .preploom-chat-header {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
        }
        .preploom-chat-avatar-small {
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .preploom-chat-actions {
          margin-left: auto;
          display: flex;
          gap: 4px;
        }
        .preploom-chat-actions button {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .preploom-chat-actions button:hover {
          background: rgba(255,255,255,0.2);
          color: white;
        }
        .preploom-chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          max-height: 350px;
          background: #f9fafb;
        }
        .message {
          margin-bottom: 1rem;
          display: flex;
          gap: 10px;
          animation: messageSlide 0.3s ease-out;
        }
        @keyframes messageSlide {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .message.bot {
          justify-content: flex-start;
        }
        .message.user {
          justify-content: flex-end;
          flex-direction: row-reverse;
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .message.bot .message-avatar {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
        }
        .message.user .message-avatar {
          background: #10b981;
          color: white;
        }
        .message-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 18px;
          line-height: 1.4;
          font-size: 15px;
          position: relative;
        }
        .message.bot .message-bubble {
          background: white;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .message.user .message-bubble {
          background: #10b981;
          color: white;
          border-bottom-right-radius: 6px;
        }
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          background: #d1d5db;
          border-radius: 50%;
          animation: typingBounce 1.4s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        .preploom-chat-input-container {
          padding: 1rem;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .preploom-quick-replies {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .quick-reply {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }
        .quick-reply:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }
        #chatInput {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 12px 20px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        #chatInput:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        #chatSend {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        #chatSend:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(30,64,175,0.4);
        }
        #chatSend:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        /* Responsive */
        @media (max-width: 768px) {
          .preploom-chat-container {
            bottom: 10px;
            right: 10px;
            left: 10px;
          }
          .preploom-chat-window {
            width: auto;
            height: calc(100vh - 80px);
            border-radius: 12px;
          }
          .preploom-quick-replies {
            flex-direction: column;
          }
          .quick-reply {
            width: 100%;
            text-align: center;
          }
        }
        /* Scrollbar */
        .preploom-chat-messages::-webkit-scrollbar {
          width: 4px;
        }
        .preploom-chat-messages::-webkit-scrollbar-track {
          background: #f3f4f6;
        }
        .preploom-chat-messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);
    
    // Cache elements
    chatToggle = document.querySelector('.preploom-chat-toggle');
    chatContainer = document.getElementById('preploom-chat');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    chatSend = document.getElementById('chatSend');
    chatMinimize = document.getElementById('chatMinimize');
    chatClose = document.getElementById('chatClose');
  }

  // Bind events
  function bindEvents() {
    chatToggle.addEventListener('click', toggleChat);
    chatMinimize.addEventListener('click', minimizeChat);
    chatClose.addEventListener('click', closeChat);
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    document.querySelectorAll('.quick-reply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const payload = e.target.dataset.payload;
        handleQuickReply(payload);
      });
    });
  }

  // Toggle chat visibility
  function toggleChat() {
    const window = document.querySelector('.preploom-chat-window');
    window.classList.toggle('active');
    if (window.classList.contains('active')) {
      chatInput.focus();
      if (chatHistory.length === 0) {
        addBotMessage(CHAT_CONFIG.welcomeMessage);
      }
    }
  }

  function minimizeChat() {
    document.querySelector('.preploom-chat-window').classList.remove('active');
  }

  function closeChat() {
    minimizeChat();
    clearHistory();
  }

  // Send user message
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isTyping) return;

    addUserMessage(text);
    chatInput.value = '';
    showTyping();

    // Get bot response
    const response = await getBotResponse(text);
    hideTyping();
    addBotMessage(response);
  }

  function handleQuickReply(payload) {
    const replies = {
      'toefl': 'Great choice! TOEFL iBT has monthly dates (Apr 5,12,19,26). Duration: 1-4hrs. Need schedule or prep tips?',
      'pmp': 'PMP is 230min online proctored, valid 3yrs. PMI authorized training available. Ready to enroll?',
      'login': 'Go to login.html to sign in. New here? Register for free — it only takes 30 seconds!',
      'dates': 'Upcoming: TOEFL Apr 2026 (5,12,19,26), PMP monthly. Check calendar section or /api/calendar.',
      'enroll': 'Login first, then visit dashboard.html and enroll via exam cards. Need login help?'
    };
    addUserMessage(replies[payload] || payload);
    setTimeout(() => {
      addBotMessage('Thanks! Need more exam info?');
    }, 800);
  }

  // Get bot response (rule-based + API)
  async function getBotResponse(userInput) {
    const lowerInput = userInput.toLowerCase();

    // Keywords
    if (lowerInput.includes('toefl') || lowerInput.includes('ibt')) return 'TOEFL iBT: Monthly tests, 1-4hrs, online/offline. Dates: Apr 5,12,19,26 2026. Check tabs above!';
    if (lowerInput.includes('ielts') || lowerInput.includes('ielts')) return 'IELTS: 48 dates/year. Academic/General. Need Academic vs General diff?';
    if (lowerInput.includes('pmp') || lowerInput.includes('project')) return 'PMP Certification: 230min, online proctored, 3yr validity. PMI authorized. Enroll now!';
    if (lowerInput.includes('login') || lowerInput.includes('sign in')) return 'Go to login.html to sign in. New here? Register for free!';
    if (lowerInput.includes('date') || lowerInput.includes('schedule')) {
      try {
        const res = await fetch((window.API_BASE || '') + '/api/calendar');
        const data = await res.json();
        return `Upcoming dates: ${data.upcoming?.slice(0,3).join(', ') || 'Check calendar widget!'}`;
      } catch {
        return 'Exam dates in calendar section. Apr 2026 TOEFL: 5,12,19,26.';
      }
    }
    if (lowerInput.includes('enroll') || lowerInput.includes('register')) return 'Login → Dashboard → Enroll exams. Need login help?';
    if (lowerInput.includes('help') || lowerInput.includes('hi')) return 'I can help with exams, dates, login, enrollment! What exam are you prepping for?';
    if (lowerInput.includes('bye') || lowerInput.includes('thanks')) return 'Happy studying! 🎓 Reach out anytime.';

    return 'Great question! For exam-specific help, try "TOEFL dates", "PMP info", or "login help". What else?';
  }

  // Add messages
  function addBotMessage(text) {
    const message = createMessageElement('bot', text);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    saveHistory('bot', text);
  }

  function addUserMessage(text) {
    const message = createMessageElement('user', text);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    saveHistory('user', text);
  }

  function createMessageElement(type, text) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `
      <div class="message-avatar">${type === 'bot' ? '🤖' : '👤'}</div>
      <div class="message-bubble">${text}</div>
    `;
    return div;
  }

  function showTyping() {
    isTyping = true;
    const typing = document.createElement('div');
    typing.className = 'message bot typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div> <span>Typing...</span>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    isTyping = false;
    const typing = chatMessages.querySelector('.typing-indicator');
    if (typing) typing.remove();
  }

  // History management
  function saveHistory(type, text) {
    chatHistory.push({ type, text, timestamp: new Date().toISOString() });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory.slice(-50))); // Limit 50
  }

  function loadHistory() {
    chatMessages.innerHTML = '';
    chatHistory.forEach(msg => {
      const el = createMessageElement(msg.type, msg.text);
      chatMessages.appendChild(el);
    });
    if (chatHistory.length > 0) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function clearHistory() {
    chatHistory = [];
    localStorage.removeItem('chatHistory');
    chatMessages.innerHTML = '';
  }

  // Render messages
  function renderChat() {
    loadHistory();
  }

  // Public API
  window.PrepLoomChat = {
    init: initChat,
    toggle: toggleChat,
    clear: clearHistory
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }

})();

