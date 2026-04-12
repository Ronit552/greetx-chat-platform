/**
 * GreetX — Interactive Chat Page JS
 * No backend. All state is in-memory.
 */

(function () {
    'use strict';

    // ──────────────────────────────────────────────
    // DATA STORE
    // ──────────────────────────────────────────────
    const ME = { name: 'You', initials: 'JD' };

    const CONTACTS = {
        aisha: {
            name: 'Aisha Siddiqui', handle: '@aisha.s', initials: 'AS', status: 'online',
            color: 'linear-gradient(135deg,#f59e0b,#d97706)',
            replies: [
                "That sounds amazing! 🎉",
                "Can't wait for 4 PM then!",
                "I'll share my screen so you can see everything.",
                "By the way, have you seen the latest design trends? 🔥",
                "I was thinking a more glassmorphic look for the app 💎",
                "What do you think about the new color palette?",
                "Also, should we add dark mode support?",
            ]
        },
        rohan: {
            name: 'Rohan Kumar', handle: '@rohan_k', initials: 'RK', status: 'online',
            color: 'linear-gradient(135deg,#10b981,#059669)',
            replies: [
                "Hey! What's up? 🚀", "Working on that new feature.",
                "The API integration is almost done!", "Check my latest commit!",
                "Wanna do a code review later?", "Found a cool open-source library btw 🐧",
            ]
        },
        maya: {
            name: 'Maya Johnson', handle: '@maya.j', initials: 'MJ', status: 'online',
            color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
            replies: [
                "Design is life 🎨", "Let me show you the new mockups!",
                "The color palette looks stunning in dark mode ✨",
                "I'm thinking of adding microanimations 🎬",
                "Travel and design inspo go hand in hand ✈️",
            ]
        },
        leo: {
            name: 'Leo Martin', handle: '@leomartin', initials: 'LM', status: 'offline',
            color: 'linear-gradient(135deg,#3b82f6,#2563eb)',
            replies: [
                "Hey, back now!", "Sorry was busy with server configs 🐧",
                "Open-source ftw!", "Have you tried that new database lib?",
                "Performance improvements are live 🚀",
            ]
        },
        priya: {
            name: 'Priya Nair', handle: '@priya_n', initials: 'PN', status: 'offline',
            color: 'linear-gradient(135deg,#ec4899,#db2777)',
            replies: [
                "Looking forward to it! 📷", "Just got back from a shoot!",
                "Check out these new photos 🌅", "The lighting was perfect.",
                "Content creation never stops 😄",
            ]
        },
        chris: {
            name: 'Chris Wu', handle: '@chriswu', initials: 'CW', status: 'offline',
            color: 'linear-gradient(135deg,#f43f5e,#e11d48)',
            replies: [
                "Product update dropped 📦", "Shipping new features this week!",
                "Sprint review went well 🎯", "Talk soon!",
                "Let's sync tomorrow?",
            ]
        },
    };

    // Messages per conversation (starts with hard-coded data from Aisha's chat)
    const MESSAGES = {
        aisha: [
            { id: 1, from: 'them', text: 'Hey, are you free later? 👋', time: '10:02 AM', reactions: {} },
            { id: 2, from: 'them', text: 'I wanted to catch up about the redesign project 🎨', time: '10:03 AM', reactions: {} },
            { id: 3, from: 'me', text: 'Hey Aisha! Yeah, I\'m free after 4 PM. What\'s up?', time: '10:06 AM', reactions: {} },
            { id: 4, from: 'them', text: 'Perfect! I\'ve been working on some new UI concepts for the app. Want to review together? 🚀', time: '10:08 AM', reactions: { '❤️': 1 } },
            { id: 5, from: 'me', text: 'Sounds great! ❤️ Can\'t wait to see what you\'ve come up with.', time: '10:10 AM', reactions: {} },
        ],
        rohan: [
            { id: 1, from: 'them', text: 'Hey! Just accepted your friend request 👋', time: '9:18 AM', reactions: {} },
            { id: 2, from: 'them', text: 'Building some cool stuff lately 🚀', time: '9:18 AM', reactions: {} },
        ],
        maya: [
            { id: 1, from: 'me', text: 'Take a look at this 🎨', time: '9:00 AM', reactions: {} },
            { id: 2, from: 'them', text: '@johndoe looks amazing! This design is 🔥', time: '9:05 AM', reactions: {} },
        ],
        leo: [
            { id: 1, from: 'me', text: 'Thanks, will check!', time: 'Yesterday', reactions: {} },
        ],
        priya: [
            { id: 1, from: 'them', text: 'Sounds great! See you there 📷', time: 'Mon', reactions: {} },
        ],
        chris: [
            { id: 1, from: 'me', text: 'Got it, talk soon 📦', time: 'Sun', reactions: {} },
        ],
    };

    let msgIdCounter = 100;
    let activeConv = 'aisha';
    let reactionTargetId = null;
    let typingTimeout = null;
    let replyReplyIndex = {};

    // ──────────────────────────────────────────────
    // ELEMENT REFS
    // ──────────────────────────────────────────────
    const convList = document.getElementById('conv-list');
    const convItems = convList.querySelectorAll('.conv-item');
    const messagesArea = document.getElementById('messages-area');
    const msgInput = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const emojiToggleBtn = document.getElementById('emoji-toggle-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const reactionPicker = document.getElementById('reaction-picker');
    const typingIndicator = document.getElementById('typing-indicator');
    const chatShell = document.getElementById('chat-shell');
    const chatPanel = document.getElementById('chat-panel');
    const chatBackBtn = document.getElementById('chat-back-btn');
    const chatToast = document.getElementById('chat-toast');
    const convSearchInput = document.getElementById('conv-search');

    // Header refs
    const headerAvatar = document.getElementById('chat-header-avatar');
    const headerInitials = document.getElementById('chat-header-initials');
    const headerName = document.getElementById('chat-header-name');
    const headerStatus = document.getElementById('chat-header-status');
    const headerDot = document.getElementById('chat-header-dot');
    // Navbar ref (for mobile hide/show)
    const glassNav = document.querySelector('.glass-nav');

    // ──────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────
    function getNow() {
        const d = new Date();
        let h = d.getHours(), m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function showToast(msg, duration = 2000) {
        chatToast.textContent = msg;
        chatToast.classList.remove('hidden');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => chatToast.classList.add('hidden'), duration);
    }

    function scrollToBottom(smooth = true) {
        messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }

    // ──────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────
    function renderMessages(convId) {
        const msgs = MESSAGES[convId] || [];
        const contact = CONTACTS[convId];
        messagesArea.innerHTML = '';

        // Date divider
        const divider = document.createElement('div');
        divider.className = 'msg-date-divider';
        divider.innerHTML = '<span>Today</span>';
        messagesArea.appendChild(divider);

        msgs.forEach(msg => {
            messagesArea.appendChild(buildMsgRow(msg, contact));
        });

        // Typing indicator always at end (hidden)
        messagesArea.appendChild(buildTypingIndicator(contact));

        scrollToBottom(false);
    }

    function buildMsgRow(msg, contact) {
        const isMe = msg.from === 'me';
        const row = document.createElement('div');
        row.className = `msg-row ${isMe ? 'outgoing' : 'incoming'}`;
        row.dataset.msgId = msg.id;

        const reactionsHtml = buildReactionsHtml(msg.reactions, msg.id);

        if (isMe) {
            row.innerHTML = `
                <div class="msg-group">
                    <div class="msg-bubble outgoing" data-msg-id="${msg.id}">
                        <p>${escapeHtml(msg.text)}</p>
                        <span class="msg-time">${msg.time} <span class="msg-status read">✓✓</span></span>
                        <div class="msg-reactions" id="reactions-${msg.id}">${reactionsHtml}</div>
                    </div>
                    <div class="msg-bubble-actions">
                        <button class="react-btn" data-target="${msg.id}" title="React">😊</button>
                    </div>
                </div>`;
        } else {
            row.innerHTML = `
                <div class="msg-bubble-avatar" style="background:${contact.color}">${contact.initials}</div>
                <div class="msg-group">
                    <div class="msg-bubble incoming" data-msg-id="${msg.id}">
                        <p>${escapeHtml(msg.text)}</p>
                        <span class="msg-time">${msg.time}</span>
                        <div class="msg-reactions" id="reactions-${msg.id}">${reactionsHtml}</div>
                    </div>
                    <div class="msg-bubble-actions">
                        <button class="react-btn" data-target="${msg.id}" title="React">😊</button>
                    </div>
                </div>`;
        }

        // Attach reaction button handler
        const reactBtn = row.querySelector('.react-btn');
        if (reactBtn) reactBtn.addEventListener('click', onReactBtnClick);

        // Attach reaction chip click
        row.querySelectorAll('.reaction-chip').forEach(chip => {
            chip.addEventListener('click', () => handleChipClick(msg.id, chip.dataset.emoji, convId));
        });

        return row;
    }

    function buildReactionsHtml(reactions, msgId) {
        return Object.entries(reactions).map(([emoji, count]) =>
            `<span class="reaction-chip" data-emoji="${emoji}" data-msg-id="${msgId}">${emoji} ${count}</span>`
        ).join('');
    }

    function buildTypingIndicator(contact) {
        const row = document.createElement('div');
        row.className = 'msg-row incoming hidden';
        row.id = 'typing-indicator';
        row.innerHTML = `
            <div class="msg-bubble-avatar" style="background:${contact.color}">${contact.initials}</div>
            <div class="msg-bubble incoming typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>`;
        return row;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ──────────────────────────────────────────────
    // UPDATE HEADER
    // ──────────────────────────────────────────────
    function updateHeader(convId) {
        const c = CONTACTS[convId];
        headerInitials.textContent = c.initials;
        headerAvatar.style.background = c.color;
        headerName.textContent = c.name;
        headerDot.className = `chat-header-dot ${c.status}`;
        headerStatus.textContent = c.status === 'online'
            ? '🟢 Online · last seen just now'
            : '⚫ Offline · was active recently';

        // Update bubble avatar on typing indicator (re-rendered on every conversation switch)
    }

    // ──────────────────────────────────────────────
    // CONVERSATION SWITCHING
    // ──────────────────────────────────────────────
    convItems.forEach(item => {
        item.addEventListener('click', () => switchConv(item.dataset.conv, item));
    });

    function switchConv(convId, itemEl) {
        if (convId === activeConv && !isMobile()) return;
        activeConv = convId;
        replyReplyIndex[convId] = replyReplyIndex[convId] || 0;

        // Update active class
        convList.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
        if (itemEl) {
            itemEl.classList.add('active');
            // Remove unread badge
            const badge = itemEl.querySelector('.conv-unread');
            if (badge) badge.remove();
        }

        updateHeader(convId);
        renderMessages(convId);

        // Mobile: slide panel in + hide navbar
        if (isMobile()) {
            chatShell.classList.add('panel-visible');
            if (glassNav) glassNav.classList.add('nav-hidden');
        }
    }

    function isMobile() {
        return window.innerWidth <= 768;
    }

    // ──────────────────────────────────────────────
    // BACK BUTTON (mobile)
    // ──────────────────────────────────────────────
    chatBackBtn.addEventListener('click', () => {
        chatShell.classList.remove('panel-visible');
        // Restore navbar on back
        if (glassNav) glassNav.classList.remove('nav-hidden');
    });

    // Show back button on mobile via CSS (handled in CSS), but also set initial state
    function handleResize() {
        if (!isMobile()) {
            chatBackBtn.classList.add('hidden');
            chatShell.classList.remove('panel-visible');
            // Always restore nav on desktop
            if (glassNav) glassNav.classList.remove('nav-hidden');
        } else {
            chatBackBtn.classList.remove('hidden');
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // ──────────────────────────────────────────────
    // SEND MESSAGE
    // ──────────────────────────────────────────────
    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text) return;

        const id = ++msgIdCounter;
        const msg = { id, from: 'me', text, time: getNow(), reactions: {} };
        MESSAGES[activeConv] = MESSAGES[activeConv] || [];
        MESSAGES[activeConv].push(msg);

        const contact = CONTACTS[activeConv];

        // Remove typing indicator before adding new message
        const oldTyping = document.getElementById('typing-indicator');
        if (oldTyping) oldTyping.remove();

        // Append outgoing bubble
        const row = buildMsgRow(msg, contact);
        row.style.animation = 'msgSlideIn 0.25s cubic-bezier(0.4,0,0.2,1)';
        messagesArea.appendChild(row);

        // Re-add typing indicator
        messagesArea.appendChild(buildTypingIndicator(contact));

        msgInput.value = '';
        msgInput.style.height = 'auto';
        sendBtn.disabled = true;
        scrollToBottom();

        // Update sidebar preview
        updateSidebarPreview(activeConv, `You: ${text}`);

        // Simulate reply after a delay
        simulateReply(activeConv);
    }

    sendBtn.addEventListener('click', sendMessage);

    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    msgInput.addEventListener('input', () => {
        // Auto grow textarea
        msgInput.style.height = 'auto';
        msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';

        sendBtn.disabled = !msgInput.value.trim();
    });

    // ──────────────────────────────────────────────
    // SIDEBAR PREVIEW UPDATE
    // ──────────────────────────────────────────────
    function updateSidebarPreview(convId, text) {
        const item = convList.querySelector(`[data-conv="${convId}"]`);
        if (!item) return;
        const lastEl = item.querySelector('.conv-last');
        if (lastEl) lastEl.textContent = text.length > 32 ? text.slice(0, 32) + '…' : text;
        const timeEl = item.querySelector('.conv-time');
        if (timeEl) timeEl.textContent = 'now';
    }

    // ──────────────────────────────────────────────
    // SIMULATE REPLY
    // ──────────────────────────────────────────────
    function simulateReply(convId) {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.classList.remove('hidden');
        scrollToBottom();

        const delay = 1200 + Math.random() * 1400;

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) indicator.classList.add('hidden');

            if (convId !== activeConv) return;

            const contact = CONTACTS[convId];
            const replies = contact.replies;
            const idx = (replyReplyIndex[convId] || 0) % replies.length;
            replyReplyIndex[convId] = idx + 1;

            const replyText = replies[idx];
            const id = ++msgIdCounter;
            const msg = { id, from: 'them', text: replyText, time: getNow(), reactions: {} };
            MESSAGES[convId].push(msg);

            const row = buildMsgRow(msg, contact);
            messagesArea.appendChild(row);
            scrollToBottom();

            updateSidebarPreview(convId, replyText);
        }, delay);
    }

    // ──────────────────────────────────────────────
    // EMOJI PICKER (for message input)
    // ──────────────────────────────────────────────
    emojiToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
        reactionPicker.classList.add('hidden');
    });

    emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            const pos = msgInput.selectionStart;
            const val = msgInput.value;
            msgInput.value = val.slice(0, pos) + emoji + val.slice(pos);
            msgInput.focus();
            msgInput.selectionStart = msgInput.selectionEnd = pos + emoji.length;
            sendBtn.disabled = !msgInput.value.trim();
            emojiPicker.classList.add('hidden');
        });
    });

    // ──────────────────────────────────────────────
    // REACTION PICKER
    // ──────────────────────────────────────────────
    function onReactBtnClick(e) {
        e.stopPropagation();
        const target = e.currentTarget.dataset.target;
        reactionTargetId = parseInt(target);

        // Position picker near button
        const rect = e.currentTarget.getBoundingClientRect();
        reactionPicker.style.top = (rect.top - 60) + 'px';
        reactionPicker.style.left = Math.max(8, rect.left - 60) + 'px';
        reactionPicker.classList.remove('hidden');
        emojiPicker.classList.add('hidden');
    }

    reactionPicker.querySelectorAll('.rp-emoji').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (reactionTargetId == null) return;
            handleChipClick(reactionTargetId, el.dataset.emoji, activeConv);
            reactionPicker.classList.add('hidden');
        });
    });

    function handleChipClick(msgId, emoji, convId) {
        const msgs = MESSAGES[convId] || [];
        const msg = msgs.find(m => m.id === msgId);
        if (!msg) return;

        if (!msg.reactions) msg.reactions = {};
        if (msg.reactions[emoji]) {
            msg.reactions[emoji]++;
        } else {
            msg.reactions[emoji] = 1;
        }

        // Re-render reactions inside that bubble
        const reactionsEl = document.getElementById(`reactions-${msgId}`);
        if (reactionsEl) {
            reactionsEl.innerHTML = buildReactionsHtml(msg.reactions, msgId);
            reactionsEl.querySelectorAll('.reaction-chip').forEach(chip => {
                chip.addEventListener('click', () => handleChipClick(msgId, chip.dataset.emoji, convId));
            });
        }
    }

    // Close pickers on outside click
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiToggleBtn) {
            emojiPicker.classList.add('hidden');
        }
        if (!reactionPicker.contains(e.target)) {
            reactionPicker.classList.add('hidden');
        }
    });

    // ──────────────────────────────────────────────
    // CONVERSATION SEARCH (sidebar filter)
    // ──────────────────────────────────────────────
    convSearchInput.addEventListener('input', () => {
        const query = convSearchInput.value.toLowerCase().trim();
        convList.querySelectorAll('.conv-item').forEach(item => {
            const name = (item.querySelector('.conv-name')?.textContent || '').toLowerCase();
            item.style.display = name.includes(query) ? '' : 'none';
        });
    });

    // ──────────────────────────────────────────────
    // ACTION BUTTONS (toast feedback)
    // ──────────────────────────────────────────────
    document.getElementById('voice-call-btn')?.addEventListener('click', () => showToast('📞 Voice call feature coming soon!'));
    document.getElementById('video-call-btn')?.addEventListener('click', () => showToast('🎥 Video call feature coming soon!'));
    document.getElementById('search-in-chat-btn')?.addEventListener('click', () => showToast('🔍 In-chat search coming soon!'));
    document.getElementById('chat-more-btn')?.addEventListener('click', () => showToast('⚙️ More options coming soon!'));
    document.getElementById('attach-btn')?.addEventListener('click', () => showToast('📎 File attachment coming soon!'));
    document.getElementById('sidebar-new-btn')?.addEventListener('click', () => showToast('✨ New chat coming soon!'));

    // ──────────────────────────────────────────────
    // INITIAL RENDER
    // ──────────────────────────────────────────────
    updateHeader('aisha');
    renderMessages('aisha');

})();
